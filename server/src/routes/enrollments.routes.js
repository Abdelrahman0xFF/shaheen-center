import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import * as enrollmentsController from '../controllers/enrollments.controller.js';

const router = Router();

// Member 3 (Marco) — FR-ENR-01..03, FR-ORG-06
router.use(authenticate, enforceBranchScope);

router.get('/', enrollmentsController.listEnrollments);
router.post(
    '/',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    enrollmentsController.enrollStudent,
);
router.patch(
    '/:id/status',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    enrollmentsController.updateEnrollmentStatus,
);
router.post(
    '/:id/transfer',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    enrollmentsController.transferStudent,
);

export default router;
