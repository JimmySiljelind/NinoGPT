import express from 'express';
import type { Request, Response } from 'express';
import { authController } from './controllers/auth.controller';
import { chatController } from './controllers/chat.controller';
import { imageChatController } from './controllers/image-chat.controller';
import { conversationController } from './controllers/conversation.controller';
import { projectController } from './controllers/project.controller';
import { userController } from './controllers/user.controller';
import { requireAuth } from './middleware/auth';

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
   res.send('Hello, World!');
});

router.get('/api/hello', (req: Request, res: Response) => {
   res.json({ message: 'Hello from the API!' });
});

router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.post('/api/auth/logout', authController.logout);
router.get('/api/auth/me', requireAuth, authController.me);

router.get('/api/conversations', requireAuth, conversationController.list);
router.get(
   '/api/conversations/archived',
   requireAuth,
   conversationController.listArchived
);
router.post('/api/conversations', requireAuth, conversationController.create);
router.delete(
   '/api/conversations',
   requireAuth,
   conversationController.deleteAll
);
router.delete(
   '/api/conversations/archived',
   requireAuth,
   conversationController.deleteArchived
);
router.get(
   '/api/conversations/:conversationId',
   requireAuth,
   conversationController.get
);
router.patch(
   '/api/conversations/:conversationId',
   requireAuth,
   conversationController.update
);
router.post(
   '/api/conversations/:conversationId/archive',
   requireAuth,
   conversationController.archive
);
router.post(
   '/api/conversations/:conversationId/unarchive',
   requireAuth,
   conversationController.unarchive
);
router.delete(
   '/api/conversations/:conversationId',
   requireAuth,
   conversationController.delete
);

router.post('/api/chat', requireAuth, chatController.sendMessage);
router.post('/api/image-chat', requireAuth, imageChatController.generateImage);

router.get('/api/projects', requireAuth, projectController.list);
router.post('/api/projects', requireAuth, projectController.create);
router.delete('/api/projects', requireAuth, projectController.deleteAll);
router.patch('/api/projects/:projectId', requireAuth, projectController.rename);
router.delete(
   '/api/projects/:projectId',
   requireAuth,
   projectController.delete
);

router.patch('/api/users/me', requireAuth, userController.updateProfile);
router.patch(
   '/api/users/me/password',
   requireAuth,
   userController.changePassword
);

export default router;
