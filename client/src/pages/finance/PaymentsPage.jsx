import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function PaymentsPage() {
    return (
        <ModulePlaceholderPage
            title="المدفوعات والإيصالات"
            subtitle="تحصيل الاشتراكات، طباعة الإيصالات (حراري / A4)، وعكس القيود بدون حذف"
            owner="Member 5 — 3ATEF"
            srsRefs={['FR-PAY-01', 'FR-PAY-02', 'FR-PAY-03', 'FR-PAY-08']}
            taskFile="tasks/05-atef.md"
        />
    );
}
