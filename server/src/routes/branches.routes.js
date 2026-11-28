import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import { validate } from '../middlewares/validate.js';
import * as branchesController from '../controllers/branches.controller.js';
import {
    branchIdParamSchema,
    branchIdRoomsParamSchema,
    createBranchSchema,
    createRoomSchema,
    listBranchesQuerySchema,
    listRoomsQuerySchema,
    roomIdParamSchema,
    updateBranchSchema,
    updateRoomSchema,
} from '../validators/branches.validator.js';

const router = Router();

// Member 1 (Ezzat) — FR-ORG-01, FR-ORG-02
const READ_ROLES = ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY'];
const ROOM_WRITE_ROLES = ['ADMIN', 'BRANCH_MANAGER'];

router.use(authenticate, enforceBranchScope);

// Branches
router.get(
    '/',
    authorizeRoles(...READ_ROLES),
    validate({ query: listBranchesQuerySchema }),
    branchesController.listBranches,
);
router.get(
    '/:id',
    authorizeRoles(...READ_ROLES),
    validate({ params: branchIdParamSchema }),
    branchesController.getBranch,
);
router.post(
    '/',
    authorizeRoles('ADMIN'),
    validate({ body: createBranchSchema }),
    branchesController.createBranch,
);
router.patch(
    '/:id',
    authorizeRoles('ADMIN'),
    validate({ params: branchIdParamSchema, body: updateBranchSchema }),
    branchesController.updateBranch,
);

// Rooms under branch
router.get(
    '/:branchId/rooms',
    authorizeRoles(...READ_ROLES),
    validate({ params: branchIdRoomsParamSchema, query: listRoomsQuerySchema }),
    branchesController.listRooms,
);
router.post(
    '/:branchId/rooms',
    authorizeRoles(...ROOM_WRITE_ROLES),
    validate({ params: branchIdRoomsParamSchema, body: createRoomSchema }),
    branchesController.createRoom,
);
router.patch(
    '/rooms/:roomId',
    authorizeRoles(...ROOM_WRITE_ROLES),
    validate({ params: roomIdParamSchema, body: updateRoomSchema }),
    branchesController.updateRoom,
);

export default router;
