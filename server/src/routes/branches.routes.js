import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import * as branchesController from '../controllers/branches.controller.js';

const router = Router();

// Member 1 (Ezzat) — FR-ORG-01, FR-ORG-02
router.use(authenticate, enforceBranchScope);

router.get('/', branchesController.listBranches);
router.post('/', authorizeRoles('ADMIN'), branchesController.createBranch);
router.patch('/:id', authorizeRoles('ADMIN'), branchesController.updateBranch);

// Rooms under branch
router.get('/:branchId/rooms', branchesController.listRooms);
router.post(
    '/:branchId/rooms',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER'),
    branchesController.createRoom,
);
router.patch(
    '/rooms/:roomId',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER'),
    branchesController.updateRoom,
);

export default router;
