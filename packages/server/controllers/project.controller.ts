import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';

import { projectRepository } from '../repositories/project.repository';
import { serializeProject } from './serializers';

export const projectController = {
   list(req: Request, res: Response) {
      const projects = projectRepository.list().map(serializeProject);

      res.json({ projects });
   },

   create(req: Request, res: Response) {
      const name =
         typeof req.body?.name === 'string' ? req.body.name.trim() : '';

      if (!name) {
         res.status(400).json({ error: 'Project name is required.' });
         return;
      }

      try {
         const project = projectRepository.create(randomUUID(), name);
         res.status(201).json({ project: serializeProject(project) });
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to create project.';
         res.status(400).json({ error: message });
      }
   },

   rename(req: Request, res: Response) {
      const projectId = req.params.projectId;

      if (!projectId) {
         res.status(400).json({ error: 'Project id is required.' });
         return;
      }

      const name =
         typeof req.body?.name === 'string' ? req.body.name.trim() : '';

      if (!name) {
         res.status(400).json({ error: 'Project name is required.' });
         return;
      }

      try {
         const project = projectRepository.rename(projectId, name);

         if (!project) {
            res.status(404).json({ error: 'Project not found.' });
            return;
         }

         res.json({ project: serializeProject(project) });
      } catch (error) {
         const message =
            error instanceof Error
               ? error.message
               : 'Failed to rename project.';
         res.status(400).json({ error: message });
      }
   },

   delete(req: Request, res: Response) {
      const projectId = req.params.projectId;

      if (!projectId) {
         res.status(400).json({ error: 'Project id is required.' });
         return;
      }

      const deleted = projectRepository.delete(projectId);

      if (!deleted) {
         res.status(404).json({ error: 'Project not found.' });
         return;
      }

      res.status(204).send();
   },
};
