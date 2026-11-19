import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function DailyClosingPage() {
    return (
        <ModulePlaceholderPage
            title="تقفيل اليومية (Daily Cash Closing)"
            subtitle="ملخص المتحصلات اليومية لكل سكرتير حسب وسيلة الدفع مع قفل اليومية بعد التأكيد"
            owner="Member 5 — 3ATEF"
            srsRefs={['FR-PAY-07']}
            taskFile="tasks/05-atef.md"
        />
    );
}
