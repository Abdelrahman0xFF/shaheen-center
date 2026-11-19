// Member 4 (Mazen) — Attendance & QR Scan Engine (FR-ATT-01..08, AC-01, AC-02)
// TODO:
// - scanQr({ qrToken, sessionId? }):
//   1. Look up active Student by qrToken (deletedAt: null).
//   2. Find active Enrollment & matching Session today (within branchScope).
//   3. Enforce one-time use per session (catch unique [sessionId, studentId] -> 409 DUPLICATE_SCAN).
//   4. Determine PRESENT vs LATE using Setting('late_threshold_minutes').
//   5. Query getStudentSubscriptionStatus(studentId, courseId) from payments.service.js (PAID / DUE).
//   6. Call enqueueNotification({ type: 'ARRIVAL', ... }) non-blocking (never await external HTTP).
//   7. Return { student (photo, name), group, attendance, subscriptionStatus } in < 1s (AC-01).
// - markManualAttendance({ sessionId, studentId, status, reason }): mandatory reason + logAudit().
// - closeSessionAttendance(sessionId): MVP replacement for 15-min cron — mark non-scanned enrolled
//   students ABSENT + enqueueNotification({ type: 'ABSENCE', idempotencyKey: `absence:${sessionId}:${studentId}` }).

export {};
