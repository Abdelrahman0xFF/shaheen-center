import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import * as studentsController from '../controllers/students.controller.js';

const router = Router();

// Member 3 (Marco) — FR-STU-01..10, AC-06
router.use(authenticate, enforceBranchScope);

router.get(
    '/',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'),
    studentsController.listStudents,
);
router.post(
    '/',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    studentsController.createStudent,
);
router.get(
    '/:id',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'),
    studentsController.getStudentProfile,
);
router.patch(
    '/:id',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    studentsController.updateStudent,
);
router.delete(
    '/:id',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER'),
    studentsController.softDeleteStudent,
);
router.post(
    '/:id/regenerate-qr',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    studentsController.regenerateQr,
);
router.get(
    '/:id/qr-card',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    studentsController.getQrCardData,
);

export default router;
