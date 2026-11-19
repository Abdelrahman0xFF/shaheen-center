import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import * as notificationsController from '../controllers/notifications.controller.js';

const router = Router();

// Member 5 (3ATEF) — Lightweight MVP Notification Log & Templates (FR-NTF-03, 11, 13)
router.use(authenticate);

router.get(
    '/',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    notificationsController.listNotifications,
);
router.get('/templates', authorizeRoles('ADMIN'), notificationsController.listTemplates);
router.patch('/templates/:id', authorizeRoles('ADMIN'), notificationsController.updateTemplate);

export default router;
