import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function StudentProfilePage() {
    return (
        <ModulePlaceholderPage
            title="ملف الطالب الشامل"
            subtitle="البيانات الأساسية، الكورسات، الحضور، المدفوعات، وكارت الـ QR"
            owner="Member 3 — Marco"
            srsRefs={['FR-STU-03', 'FR-STU-07', 'UI-06']}
            taskFile="tasks/03-marco.md"
        />
    );
}
