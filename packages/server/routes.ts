import express from 'express';
import type { Request, Response } from 'express';
import { chatController } from './controllers/chat.controller';
import { conversationController } from './controllers/conversation.controller';
import { projectController } from './controllers/project.controller';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!');
});

router.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello from the API!' });
});

router.get('/api/conversations', conversationController.list);
router.post('/api/conversations', conversationController.create);
router.get('/api/conversations/:conversationId', conversationController.get);
router.patch(
   '/api/conversations/:conversationId',
   conversationController.update
);
router.delete(
   '/api/conversations/:conversationId',
   conversationController.delete
);

router.post('/api/chat', chatController.sendMessage);

router.get('/api/projects', projectController.list);
router.post('/api/projects', projectController.create);
router.patch('/api/projects/:projectId', projectController.rename);
router.delete('/api/projects/:projectId', projectController.delete);

export default router;
