import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function ReceptionPage() {
    return (
        <ModulePlaceholderPage
            title="شاشة الاستقبال (مسح الـ QR)"
            subtitle="مسح سريع بقارئ الـ USB أو الكاميرا مع عرض حالة الدفع (أخضر/أحمر) وأزرار التحصيل والتحضير اليدوي"
            owner="Member 4 — Mazen"
            srsRefs={['FR-ATT-01..06', 'FR-REC-01..05', 'UI-05', 'AC-01', 'AC-02']}
            taskFile="tasks/04-mazen.md"
        />
    );
}
