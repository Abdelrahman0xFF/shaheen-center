import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import { validate } from '../middlewares/validate.js';
import * as staffController from '../controllers/staff.controller.js';
import {
    createStaffSchema,
    listStaffQuerySchema,
    resetStaffPasswordSchema,
    staffIdParamSchema,
    toggleStaffStatusSchema,
    updateStaffSchema,
} from '../validators/staff.validator.js';

const router = Router();

// Member 1 (Ezzat) — FR-AUTH-05 (Admin only)
router.use(authenticate, authorizeRoles('ADMIN'), enforceBranchScope);

router.get('/', validate({ query: listStaffQuerySchema }), staffController.listStaff);
router.post('/', validate({ body: createStaffSchema }), staffController.createStaff);
router.patch(
    '/:id',
    validate({ params: staffIdParamSchema, body: updateStaffSchema }),
    staffController.updateStaff,
);
router.patch(
    '/:id/status',
    validate({ params: staffIdParamSchema, body: toggleStaffStatusSchema }),
    staffController.toggleStaffStatus,
);
router.post(
    '/:id/reset-password',
    validate({ params: staffIdParamSchema, body: resetStaffPasswordSchema }),
    staffController.resetStaffPassword,
);

export default router;
