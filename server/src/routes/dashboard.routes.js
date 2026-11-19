import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

// Member 5 (3ATEF) — Lite Admin Dashboard (FR-ADM-10 lite)
router.use(authenticate, enforceBranchScope, authorizeRoles('ADMIN', 'BRANCH_MANAGER'));

router.get('/summary', dashboardController.getDashboardSummary);

export default router;
