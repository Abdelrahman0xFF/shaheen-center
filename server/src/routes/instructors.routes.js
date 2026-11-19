import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import * as instructorsController from '../controllers/instructors.controller.js';

const router = Router();

// Member 2 (George) — FR-ORG-03
router.use(authenticate);

router.get('/', instructorsController.listInstructors);
router.post('/', authorizeRoles('ADMIN', 'BRANCH_MANAGER'), instructorsController.createInstructor);
router.patch(
    '/:id',
    authorizeRoles('ADMIN', 'BRANCH_MANAGER'),
    instructorsController.updateInstructor,
);

export default router;
