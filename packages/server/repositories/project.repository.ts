import database from '../database';

export type ProjectRecord = {
   id: string;
   userId: string;
   name: string;
   createdAt: Date;
   updatedAt: Date;
   conversationCount: number;
};

type ProjectRow = {
   id: string;
   user_id: string;
   name: string;
   created_at: string;
   updated_at: string;
   conversation_count: number;
};

const selectProjectsStmt = database.query<ProjectRow, { $userId: string }>(
   `SELECT p.id,
           p.user_id,
           p.name,
           p.created_at,
           p.updated_at,
           COUNT(c.id) AS conversation_count
    FROM projects p
    LEFT JOIN conversations c ON c.project_id = p.id AND c.user_id = $userId
    WHERE p.user_id = $userId
    GROUP BY p.id
    ORDER BY p.updated_at DESC`
);

const selectProjectStmt = database.query<
   ProjectRow,
   { $userId: string; $id: string }
>(
   `SELECT p.id,
           p.user_id,
           p.name,
           p.created_at,
           p.updated_at,
           (SELECT COUNT(*) FROM conversations WHERE project_id = p.id AND user_id = $userId) AS conversation_count
    FROM projects p
    WHERE p.id = $id AND p.user_id = $userId`
);

const insertProjectStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $userId: string;
      $name: string;
      $createdAt: string;
      $updatedAt: string;
   }
>(
   `INSERT INTO projects (id, user_id, name, created_at, updated_at)
    VALUES ($id, $userId, $name, $createdAt, $updatedAt)`
);

const updateProjectStmt = database.query<
   Record<string, never>,
   {
      $id: string;
      $userId: string;
      $name: string;
      $updatedAt: string;
   }
>(
   `UPDATE projects
    SET name = $name,
        updated_at = $updatedAt
    WHERE id = $id AND user_id = $userId`
);

const deleteProjectStmt = database.query<
   Record<string, never>,
   { $id: string; $userId: string }
>(
   `DELETE FROM projects
    WHERE id = $id AND user_id = $userId`
);

const projectExistsStmt = database.query<
   { id: string },
   { $id: string; $userId: string }
>(
   `SELECT id
    FROM projects
    WHERE id = $id AND user_id = $userId`
);

function rowToProject(row: ProjectRow): ProjectRecord {
   return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      conversationCount: Number(row.conversation_count) ?? 0,
   };
}

function fetchProject(userId: string, projectId: string): ProjectRecord | null {
   const row = selectProjectStmt.get({ $id: projectId, $userId: userId }) as
      | ProjectRow
      | undefined
      | null;

   if (!row) {
      return null;
   }

   return rowToProject(row);
}

export const projectRepository = {
   list(userId: string) {
      const rows = selectProjectsStmt.all({ $userId: userId }) as ProjectRow[];
      return rows.map(rowToProject);
   },

   get(userId: string, projectId: string) {
      return fetchProject(userId, projectId);
   },

   exists(userId: string, projectId: string) {
      const row = projectExistsStmt.get({
         $id: projectId,
         $userId: userId,
      }) as { id: string } | undefined | null;
      return Boolean(row);
   },

   create(userId: string, projectId: string, name: string) {
      const now = new Date().toISOString();

      insertProjectStmt.run({
         $id: projectId,
         $userId: userId,
         $name: name.trim(),
         $createdAt: now,
         $updatedAt: now,
      });

      const project = fetchProject(userId, projectId);

      if (!project) {
         throw new Error('Project could not be created.');
      }

      return project;
   },

   rename(userId: string, projectId: string, name: string) {
      const trimmed = name.trim();

      if (!trimmed) {
         throw new Error('Project name cannot be empty.');
      }

      const now = new Date().toISOString();

      const exists = projectExistsStmt.get({
         $id: projectId,
         $userId: userId,
      }) as { id: string } | undefined | null;

      if (!exists) {
         return null;
      }

      updateProjectStmt.run({
         $id: projectId,
         $userId: userId,
         $name: trimmed,
         $updatedAt: now,
      });

      const project = fetchProject(userId, projectId);

      if (!project) {
         throw new Error('Project not found after rename.');
      }

      return project;
   },

   delete(userId: string, projectId: string) {
      const exists = projectExistsStmt.get({
         $id: projectId,
         $userId: userId,
      }) as { id: string } | undefined | null;

      if (!exists) {
         return false;
      }

      deleteProjectStmt.run({ $id: projectId, $userId: userId });
      return true;
   },
};
