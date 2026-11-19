import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import { scanRateLimiter } from '../middlewares/rateLimiter.js';
import * as attendanceController from '../controllers/attendance.controller.js';

const router = Router();

// Member 4 (Mazen) — FR-ATT-01..08, FR-REC-01..05, AC-01, AC-02
router.use(authenticate, enforceBranchScope);

router.post(
    '/scan',
    scanRateLimiter,
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    attendanceController.scanQr,
);
router.post(
    '/manual',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'),
    attendanceController.markManualAttendance,
);
router.post(
    '/sessions/:sessionId/close',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'),
    attendanceController.closeSessionAttendance,
);
router.get('/sessions/:sessionId', attendanceController.getSessionAttendanceSheet);
router.get('/students/:studentId/summary', attendanceController.getStudentAttendanceSummary);

export default router;
