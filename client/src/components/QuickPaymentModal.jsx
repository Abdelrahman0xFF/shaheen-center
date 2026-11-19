import { Modal, Button } from './ui';

/**
 * Shared component owned by Member 5 (3ATEF), imported by Member 4 (ReceptionPage)
 * and Member 3 (StudentProfilePage) for instant fee collection (FR-REC-03, FR-PAY-01).
 */
export function QuickPaymentModal({ open, onClose, studentId, courseId, onSuccess }) {
    return (
        <Modal open={open} onClose={onClose} title="تحصيل اشتراك سريع">
            <div className="space-y-4">
                <p className="text-sm text-ink-600">
                    مكون تحصيل الاشتراك السريع (قيد التطوير بواسطة Member 5 — 3ATEF).
                </p>
                <div className="rounded-lg bg-surface-bg p-3 text-xs text-ink-600" dir="ltr">
                    studentId: {studentId || '—'} | courseId: {courseId || '—'}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={onClose}>
                        إغلاق
                    </Button>
                    <Button
                        onClick={() => {
                            onSuccess?.();
                            onClose?.();
                        }}
                    >
                        تأكيد تجريبي
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
