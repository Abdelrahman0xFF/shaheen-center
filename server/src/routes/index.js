import { Router } from 'express';

// Member 1 (Ezzat)
import authRoutes from './auth.routes.js';
import staffRoutes from './staff.routes.js';
import branchesRoutes from './branches.routes.js';
import settingsRoutes from './settings.routes.js';

// Member 2 (George)
import instructorsRoutes from './instructors.routes.js';
import coursesRoutes from './courses.routes.js';
import groupsRoutes from './groups.routes.js';
import sessionsRoutes from './sessions.routes.js';

// Member 3 (Marco)
import studentsRoutes from './students.routes.js';
import enrollmentsRoutes from './enrollments.routes.js';

// Member 4 (Mazen)
import attendanceRoutes from './attendance.routes.js';

// Member 5 (3ATEF)
import paymentsRoutes from './payments.routes.js';
import closingsRoutes from './closings.routes.js';
import notificationsRoutes from './notifications.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

// Member 1
router.use('/auth', authRoutes);
router.use('/staff', staffRoutes);
router.use('/branches', branchesRoutes);
router.use('/settings', settingsRoutes);

// Member 2
router.use('/instructors', instructorsRoutes);
router.use('/courses', coursesRoutes);
router.use('/groups', groupsRoutes);
router.use('/sessions', sessionsRoutes);

// Member 3
router.use('/students', studentsRoutes);
router.use('/enrollments', enrollmentsRoutes);

// Member 4
router.use('/attendance', attendanceRoutes);

// Member 5
router.use('/payments', paymentsRoutes);
router.use('/closings', closingsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
