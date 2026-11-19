import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import * as groupsController from '../controllers/groups.controller.js';

const router = Router();

// Member 2 (George) — FR-ORG-04, FR-ORG-05 (Conflict Detection / AC-04), FR-ORG-07
router.use(authenticate, enforceBranchScope);

router.get('/', groupsController.listGroups);
router.post('/', authorizeRoles('ADMIN', 'BRANCH_MANAGER'), groupsController.createGroup);
router.patch('/:id', authorizeRoles('ADMIN', 'BRANCH_MANAGER'), groupsController.updateGroup);
router.post(
    '/:id/generate-sessions',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER'),
    groupsController.generateSessions,
);

export default router;
