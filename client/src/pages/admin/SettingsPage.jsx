import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function SettingsPage() {
    return (
        <ModulePlaceholderPage
            title="التقويم الدراسي والإعدادات"
            subtitle="إدارة الفصول الدراسية، الإجازات الرسمية، وحد التأخير"
            owner="Member 1 — Ezzat"
            srsRefs={['FR-CAL-01', 'FR-ADM-07']}
            taskFile="tasks/01-ezzat.md"
        />
    );
}
