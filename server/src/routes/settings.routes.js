import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import * as settingsController from '../controllers/settings.controller.js';

const router = Router();

// Member 1 (Ezzat) — FR-CAL-01, FR-ADM-07, FR-RPT-02, FR-RPT-03
router.use(authenticate);

router.get('/', settingsController.getSettings);
router.patch('/', authorizeRoles('ADMIN'), settingsController.updateSettings);

// Academic terms & holidays
router.get('/terms', settingsController.listTerms);
router.post('/terms', authorizeRoles('ADMIN'), settingsController.createTerm);
router.get('/holidays', settingsController.listHolidays);
router.post('/holidays', authorizeRoles('ADMIN'), settingsController.createHoliday);
router.delete('/holidays/:id', authorizeRoles('ADMIN'), settingsController.deleteHoliday);

// Immutable Audit Log (Admin only)
router.get('/audit-logs', authorizeRoles('ADMIN'), settingsController.listAuditLogs);

export default router;
