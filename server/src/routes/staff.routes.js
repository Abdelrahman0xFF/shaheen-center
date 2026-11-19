import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import * as staffController from '../controllers/staff.controller.js';

const router = Router();

// Member 1 (Ezzat) — FR-AUTH-05 (Admin only)
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/', staffController.listStaff);
router.post('/', staffController.createStaff);
router.patch('/:id', staffController.updateStaff);
router.patch('/:id/status', staffController.toggleStaffStatus);
router.post('/:id/reset-password', staffController.resetStaffPassword);

export default router;
