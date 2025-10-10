import { ChatRequestError, makeJsonRequest } from './chat-client';
import type { ChatProject } from '@/types/project';

type ProjectDto = {
   id: string;
   name: string;
   createdAt: string;
   updatedAt: string;
   conversationCount?: number;
};

function parseProject(dto: ProjectDto): ChatProject {
   return {
      id: dto.id,
      name: dto.name,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      conversationCount: dto.conversationCount ?? 0,
   };
}

export async function listProjects(): Promise<ChatProject[]> {
   const data = await makeJsonRequest('/api/projects');

   if (!data || !Array.isArray(data.projects)) {
      return [];
   }

   return (data.projects as ProjectDto[]).map(parseProject);
}

export async function createProject(name: string): Promise<ChatProject> {
   const trimmed = name.trim();

   if (!trimmed) {
      throw new ChatRequestError('Project name is required.');
   }

   const data = await makeJsonRequest('/api/projects', {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: trimmed }),
   });

   if (!data || !data.project) {
      throw new ChatRequestError('Failed to create project.');
   }

   return parseProject(data.project as ProjectDto);
}

export async function renameProject(
   projectId: string,
   name: string
): Promise<ChatProject> {
   if (!projectId) {
      throw new ChatRequestError('Project id is required.');
   }

   const trimmed = name.trim();

   if (!trimmed) {
      throw new ChatRequestError('Project name is required.');
   }

   const data = await makeJsonRequest(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: trimmed }),
   });

   if (!data || !data.project) {
      throw new ChatRequestError('Failed to rename project.');
   }

   return parseProject(data.project as ProjectDto);
}

export async function deleteProject(projectId: string): Promise<void> {
   if (!projectId) {
      throw new ChatRequestError('Project id is required.');
   }

   await makeJsonRequest(`/api/projects/${projectId}`, {
      method: 'DELETE',
   });
}

export async function deleteAllProjects(): Promise<number> {
   const data = await makeJsonRequest('/api/projects', {
      method: 'DELETE',
   });

   if (!data || typeof data !== 'object' || !('deleted' in data)) {
      return 0;
   }

   const deleted = (data as { deleted?: number }).deleted;
   return typeof deleted === 'number' ? deleted : 0;
}
