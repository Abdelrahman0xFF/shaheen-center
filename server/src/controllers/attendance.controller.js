import { notImplemented } from '../utils/notImplemented.js';

// Member 4 (Mazen)
export const scanQr = notImplemented('Member 4 (Mazen)', 'POST /api/attendance/scan');
export const markManualAttendance = notImplemented(
    'Member 4 (Mazen)',
    'POST /api/attendance/manual',
);
export const closeSessionAttendance = notImplemented(
    'Member 4 (Mazen)',
    'POST /api/attendance/sessions/:sessionId/close',
);
export const getSessionAttendanceSheet = notImplemented(
    'Member 4 (Mazen)',
    'GET /api/attendance/sessions/:sessionId',
);
export const getStudentAttendanceSummary = notImplemented(
    'Member 4 (Mazen)',
    'GET /api/attendance/students/:studentId/summary',
);
