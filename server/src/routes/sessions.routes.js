import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import * as sessionsController from '../controllers/sessions.controller.js';

const router = Router();

// Member 2 (George) — FR-ORG-07, FR-ORG-08
router.use(authenticate, enforceBranchScope);

router.get('/', sessionsController.listSessions);
router.get('/:id', sessionsController.getSessionById);
router.patch(
    '/:id/cancel',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER'),
    sessionsController.cancelSession,
);
router.patch(
    '/:id/reschedule',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER'),
    sessionsController.rescheduleSession,
);

export default router;
