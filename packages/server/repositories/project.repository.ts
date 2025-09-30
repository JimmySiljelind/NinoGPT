import database from '../database';

export type ProjectRecord = {
   id: string;
   name: string;
   createdAt: Date;
   updatedAt: Date;
   conversationCount: number;
};

type ProjectRow = {
   id: string;
   name: string;
   created_at: string;
   updated_at: string;
   conversation_count: number;
};

const selectProjectsStmt = database.query<ProjectRow, Record<string, never>>(
   `SELECT p.id,
           p.name,
           p.created_at,
           p.updated_at,
           COUNT(c.id) AS conversation_count
    FROM projects p
    LEFT JOIN conversations c ON c.project_id = p.id
    GROUP BY p.id
    ORDER BY p.updated_at DESC`
);

const selectProjectStmt = database.query<ProjectRow, { $id: string }>(
   `SELECT p.id,
           p.name,
           p.created_at,
           p.updated_at,
           (SELECT COUNT(*) FROM conversations WHERE project_id = p.id) AS conversation_count
    FROM projects p
    WHERE p.id = $id`
);

const insertProjectStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $name: string;
      $createdAt: string;
      $updatedAt: string;
   }
>(
   `INSERT INTO projects (id, name, created_at, updated_at)
    VALUES ($id, $name, $createdAt, $updatedAt)`
);

const updateProjectStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $name: string;
      $updatedAt: string;
   }
>(
   `UPDATE projects
    SET name = $name,
        updated_at = $updatedAt
    WHERE id = $id`
);

const deleteProjectStmt = database.query<
   Record<string, never>,
   { $id: string }
>(
   `DELETE FROM projects
    WHERE id = $id`
);

const projectExistsStmt = database.query<{ id: string }, { $id: string }>(
   `SELECT id
    FROM projects
    WHERE id = $id`
);

function rowToProject(row: ProjectRow): ProjectRecord {
   return {
      id: row.id,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      conversationCount: Number(row.conversation_count) ?? 0,
   };
}

function fetchProject(projectId: string): ProjectRecord | null {
   const row = selectProjectStmt.get({ $id: projectId }) as
      | ProjectRow
      | undefined
      | null;

   if (!row) {
      return null;
   }

   return rowToProject(row);
}

export const projectRepository = {
   list() {
      const rows = selectProjectsStmt.all(
         {} as Record<string, never>
      ) as ProjectRow[];
      return rows.map(rowToProject);
   },

   get(projectId: string) {
      return fetchProject(projectId);
   },

   exists(projectId: string) {
      const row = projectExistsStmt.get({ $id: projectId }) as
         | { id: string }
         | undefined
         | null;
      return Boolean(row);
   },

   create(projectId: string, name: string) {
      const now = new Date().toISOString();

      insertProjectStmt.run({
         $id: projectId,
         $name: name.trim(),
         $createdAt: now,
         $updatedAt: now,
      });

      const project = fetchProject(projectId);

      if (!project) {
         throw new Error('Project could not be created.');
      }

      return project;
   },

   rename(projectId: string, name: string) {
      const trimmed = name.trim();

      if (!trimmed) {
         throw new Error('Project name cannot be empty.');
      }

      const now = new Date().toISOString();

      const exists = projectExistsStmt.get({ $id: projectId }) as
         | { id: string }
         | undefined
         | null;

      if (!exists) {
         return null;
      }

      updateProjectStmt.run({
         $id: projectId,
         $name: trimmed,
         $updatedAt: now,
      });

      const project = fetchProject(projectId);

      if (!project) {
         throw new Error('Project not found after rename.');
      }

      return project;
   },

   delete(projectId: string) {
      const exists = projectExistsStmt.get({ $id: projectId }) as
         | { id: string }
         | undefined
         | null;

      if (!exists) {
         return false;
      }

      deleteProjectStmt.run({ $id: projectId });
      return true;
   },
};
