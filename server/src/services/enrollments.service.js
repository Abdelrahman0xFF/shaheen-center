// Member 3 (Marco) — Enrollments & Transfers Service (FR-ENR-01..03, FR-ORG-06)
// TODO:
// - enrollStudent: check active enrollment count against min(group.capacity, room.capacity).
//   Block if full unless req.user.role === 'ADMIN' && capacityOverrideReason is provided (and logAudit!).
// - transferStudent: end old Enrollment (status: ENDED, endDate: now) and create new ACTIVE Enrollment
//   in target group inside prisma.$transaction(), preserving all past attendance & payments (FR-ENR-02).

export {};
