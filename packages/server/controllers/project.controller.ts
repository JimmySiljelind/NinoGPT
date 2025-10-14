import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';

import { projectRepository } from '../repositories/project.repository';
import { serializeProject } from './serializers';

const projectIdSchema = z.string().uuid('Invalid project id.');

const projectNameSchema = z
   .string()
   .trim()
   .min(1, 'Project name is required.')
   .max(120, 'Project name is too long.');

const projectPayloadSchema = z.object({
   name: projectNameSchema,
});

function ensureUser(req: Request, res: Response): string | null {
   if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return null;
   }

   return req.user.id;
}

function parseProjectId(value: unknown, res: Response): string | null {
   if (typeof value !== 'string') {
      res.status(400).json({ error: 'Project id is required.' });
      return null;
   }

   const trimmed = value.trim();

   if (!trimmed) {
      res.status(400).json({ error: 'Project id is required.' });
      return null;
   }

   const result = projectIdSchema.safeParse(trimmed);

   if (!result.success) {
      res.status(400).json({ error: 'Invalid project id.' }); // Reject malformed identifiers early.
      return null;
   }

   return result.data;
}

function getValidationMessage(error: z.ZodError) {
   const issue = error.issues[0];
   return issue?.message ?? 'Invalid project payload.';
}

export const projectController = {
   list(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const projects = projectRepository.list(userId).map(serializeProject);

      res.json({ projects });
   },

   create(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const payloadResult = projectPayloadSchema.safeParse(req.body ?? {});

      if (!payloadResult.success) {
         res.status(400).json({
            error: getValidationMessage(payloadResult.error),
            details: payloadResult.error.flatten().fieldErrors,
         });
         return;
      }

      try {
         const project = projectRepository.create(
            userId,
            randomUUID(),
            payloadResult.data.name
         );
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
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const projectId = parseProjectId(req.params.projectId, res);

      if (!projectId) {
         return;
      }

      const payloadResult = projectPayloadSchema.safeParse(req.body ?? {});

      if (!payloadResult.success) {
         res.status(400).json({
            error: getValidationMessage(payloadResult.error),
            details: payloadResult.error.flatten().fieldErrors,
         });
         return;
      }

      try {
         const project = projectRepository.rename(
            userId,
            projectId,
            payloadResult.data.name
         );

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
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const projectId = parseProjectId(req.params.projectId, res);

      if (!projectId) {
         return;
      }

      const deleted = projectRepository.delete(userId, projectId);

      if (!deleted) {
         res.status(404).json({ error: 'Project not found.' });
         return;
      }

      res.status(204).send();
   },

   deleteAll(req: Request, res: Response) {
      const userId = ensureUser(req, res);

      if (!userId) {
         return;
      }

      const deleted = projectRepository.deleteAll(userId);
      res.json({ deleted });
   },
};
