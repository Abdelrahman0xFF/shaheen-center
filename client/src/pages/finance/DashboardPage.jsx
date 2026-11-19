import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function DashboardPage() {
    return (
        <ModulePlaceholderPage
            title="لوحة التحكم الرئيسية"
            subtitle="ملخص الطلاب، حضور اليوم، الإيرادات، وحصص اليوم"
            owner="Member 5 — 3ATEF"
            srsRefs={['FR-ADM-10 (Lite)', 'UI-04']}
            taskFile="tasks/05-atef.md"
        />
    );
}
