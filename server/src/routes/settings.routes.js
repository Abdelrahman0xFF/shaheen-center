import { Router } from 'express';
import { authenticate } from '../middlewares/authenticate.js';
import { authorizeRoles } from '../middlewares/authorizeRoles.js';
import { validate } from '../middlewares/validate.js';
import * as settingsController from '../controllers/settings.controller.js';
import {
    createHolidaySchema,
    createTermSchema,
    holidayIdParamSchema,
    listAuditLogsQuerySchema,
    listHolidaysQuerySchema,
    listTermsQuerySchema,
    termIdParamSchema,
    updateHolidaySchema,
    updateSettingsSchema,
    updateTermSchema,
} from '../validators/settings.validator.js';

const router = Router();

// Member 1 (Ezzat) — FR-CAL-01, FR-ADM-07, FR-RPT-02, FR-RPT-03
const CAL_READ_ROLES = ['ADMIN', 'BRANCH_MANAGER', 'SECRETARY', 'INSTRUCTOR'];

router.use(authenticate);

// Global settings (no branch scope)
router.get('/', settingsController.getSettings);
router.patch(
    '/',
    authorizeRoles('ADMIN'),
    validate({ body: updateSettingsSchema }),
    settingsController.updateSettings,
);

// Academic terms & holidays
router.get(
    '/terms',
    authorizeRoles(...CAL_READ_ROLES),
    validate({ query: listTermsQuerySchema }),
    settingsController.listTerms,
);
router.post(
    '/terms',
    authorizeRoles('ADMIN'),
    validate({ body: createTermSchema }),
    settingsController.createTerm,
);
router.patch(
    '/terms/:id',
    authorizeRoles('ADMIN'),
    validate({ params: termIdParamSchema, body: updateTermSchema }),
    settingsController.updateTerm,
);

router.get(
    '/holidays',
    authorizeRoles(...CAL_READ_ROLES),
    validate({ query: listHolidaysQuerySchema }),
    settingsController.listHolidays,
);
router.post(
    '/holidays',
    authorizeRoles('ADMIN'),
    validate({ body: createHolidaySchema }),
    settingsController.createHoliday,
);
router.patch(
    '/holidays/:id',
    authorizeRoles('ADMIN'),
    validate({ params: holidayIdParamSchema, body: updateHolidaySchema }),
    settingsController.updateHoliday,
);
router.delete(
    '/holidays/:id',
    authorizeRoles('ADMIN'),
    validate({ params: holidayIdParamSchema }),
    settingsController.deleteHoliday,
);

// Immutable Audit Log (Admin only)
router.get(
    '/audit-logs',
    authorizeRoles('ADMIN'),
    validate({ query: listAuditLogsQuerySchema }),
    settingsController.listAuditLogs,
);

export default router;
