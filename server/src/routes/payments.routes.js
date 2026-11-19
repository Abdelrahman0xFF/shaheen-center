import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { enforceBranchScope } from '../middlewares/enforceBranchScope.js';
import * as paymentsController from '../controllers/payments.controller.js';

const router = Router();

// Member 5 (3ATEF) — FR-PAY-01, 02, 03, 06, 08
router.use(authenticate, enforceBranchScope);

router.get(
    '/',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    paymentsController.listPayments,
);
router.post(
    '/',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    paymentsController.createPayment,
);
router.get(
    '/:id/receipt',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    paymentsController.getReceipt,
);
router.post('/:id/void', authorizeRoles('ADMIN', 'BRANCH_MANAGER'), paymentsController.voidPayment);
router.get(
    '/students/:studentId/subscription',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER', 'SECRETARY'),
    paymentsController.getStudentSubscription,
);

export default router;
