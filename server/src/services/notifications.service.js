import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

/**
 * Renders {{variable}} placeholders in an Arabic message template (FR-NTF-11).
 */
export function renderTemplate(body, vars = {}) {
    return String(body).replace(/\{\{(\w+)\}\}/g, (_match, key) =>
        vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : '',
    );
}

/**
 * Member 5 (3ATEF) — MVP Notification Persistence Service (FR-NTF-01, FR-NTF-03, FR-NTF-13).
 *
 * Shared cross-member contract consumed by Member 2 (session changes), Member 4 (arrival/absence),
 * and Member 5 (payment receipts).
 *
 * MVP Note: No BullMQ/Redis yet. Writes a persistent Notification row with idempotencyKey protection.
 * Swapping to BullMQ + Zagel post-MVP only requires updating this single function.
 */
export async function enqueueNotification({
    studentId,
    recipientPhone,
    type,
    templateCode = null,
    variables = {},
    fallbackBody = '',
    idempotencyKey,
}) {
    if (!idempotencyKey) {
        throw new Error('idempotencyKey is required for enqueueNotification (FR-NTF-13)');
    }

    let messageBody = fallbackBody;
    if (templateCode) {
        const tpl = await prisma.messageTemplate.findUnique({ where: { code: templateCode } });
        if (tpl && tpl.isActive) {
            messageBody = renderTemplate(tpl.body, variables);
        }
    }

    const isMock = env.notificationMode === 'MOCK';

    try {
        return await prisma.notification.create({
            data: {
                studentId,
                recipientPhone,
                type,
                messageBody,
                idempotencyKey,
                status: isMock ? 'SENT_MOCK' : 'QUEUED',
                attempts: isMock ? 1 : 0,
                sentAt: isMock ? new Date() : null,
            },
        });
    } catch (err) {
        // Idempotency guarantee: duplicate event key is safely ignored (FR-NTF-13, AC-05)
        if (err?.code === 'P2002') {
            return prisma.notification.findUnique({ where: { idempotencyKey } });
        }
        throw err;
    }
}
