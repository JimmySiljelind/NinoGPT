import express from 'express';
import type { Request, Response } from 'express';
import { chatController } from './controllers/chat.controller';
import { conversationController } from './controllers/conversation.controller';

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

router.post('/api/chat', chatController.sendMessage);

export default router;
