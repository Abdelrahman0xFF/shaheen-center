import { prisma } from '../config/prisma.js';

/**
 * Member 5 (3ATEF) — Payments & Subscription Service (FR-PAY-01, 02, 03, 08)
 *
 * Shared cross-member contract consumed by Member 4's Reception QR Scan:
 * Returns { status: 'PAID' | 'DUE' | 'EXPIRED', lastPayment, periodEnd } in < 50ms.
 */
export async function getStudentSubscriptionStatus(studentId, courseId) {
    const now = new Date();
    const latestPayment = await prisma.payment.findFirst({
        where: {
            studentId,
            courseId,
            status: 'COMPLETED',
            deletedAt: null,
        },
        orderBy: { paidAt: 'desc' },
        select: {
            id: true,
            receiptNo: true,
            amount: true,
            paidAt: true,
            periodStart: true,
            periodEnd: true,
            sessionsCount: true,
        },
    });

    if (!latestPayment) {
        return { status: 'DUE', lastPayment: null, periodEnd: null };
    }

    if (latestPayment.periodEnd && new Date(latestPayment.periodEnd) < now) {
        return {
            status: 'EXPIRED',
            lastPayment: latestPayment,
            periodEnd: latestPayment.periodEnd,
        };
    }

    return {
        status: 'PAID',
        lastPayment: latestPayment,
        periodEnd: latestPayment.periodEnd,
    };
}

// TODO (Member 5):
// - createPayment: generate unique receiptNo (e.g., RCP-YYYYMMDD-XXXX), save Decimal amount,
//   logAudit(), and call enqueueNotification({ type: 'PAYMENT_RECEIPT', ... }).
// - voidPayment: NEVER hard-delete; set status = 'VOIDED', voidedAt, voidReason, voidedById + logAudit().
