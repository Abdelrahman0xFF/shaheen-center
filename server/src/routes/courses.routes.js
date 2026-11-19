import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import * as coursesController from '../controllers/courses.controller.js';

const router = Router();

// Member 2 (George) — FR-ORG-03
router.use(authenticate);

router.get('/', coursesController.listCourses);
router.post('/', authorizeRoles('ADMIN', 'BRANCH_MANAGER'), coursesController.createCourse);
router.patch('/:id', authorizeRoles('ADMIN', 'BRANCH_MANAGER'), coursesController.updateCourse);

export default router;
