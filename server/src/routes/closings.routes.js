import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import * as closingsController from '../controllers/closings.controller.js';

const router = Router();

// Member 5 (3ATEF) — Daily Cash Closing (FR-PAY-07)
router.use(
    authenticate,
    enforceBranchScope,
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
);

router.get('/preview', closingsController.previewDailyClosing);
router.post('/', closingsController.confirmDailyClosing);
router.get('/', closingsController.listClosings);

export default router;
