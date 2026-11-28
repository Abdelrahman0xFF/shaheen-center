import { prisma } from '../config/prisma.js';
import { redactSensitive } from './redact.js';

/**
 * Writes an immutable audit log entry (FR-RPT-02, FR-RPT-03, NFR-DAT-03).
 * Used across all 5 members' services for sensitive writes (QR regen, manual attendance,
 * capacity overrides, payments, voids, soft deletes, staff updates).
 */
export async function logAudit({
    userId = null,
    action,
    entity,
    entityId = null,
    before = null,
    after = null,
    ipAddress = null,
    tx = null,
}) {
    const client = tx || prisma;
    return client.auditLog.create({
        data: {
            userId,
            action,
            entity,
            entityId,
            before: sanitizeAuditPayload(before),
            after: sanitizeAuditPayload(after),
            ipAddress,
        },
    });
}

/** Defensive redaction so secrets never reach the immutable audit store. */
export function sanitizeAuditPayload(value) {
    if (value === null || value === undefined) return null;
    return redactSensitive(value);
}
