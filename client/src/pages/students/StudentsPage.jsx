import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function StudentsPage() {
    return (
        <ModulePlaceholderPage
            title="الطلاب والتسكين"
            subtitle="تسجيل الطلاب، تشفير الرقم القومي، طباعة كارت الـ QR، والتسكين في المجموعات"
            owner="Member 3 — Marco"
            srsRefs={['FR-STU-01..10', 'FR-ENR-01..03', 'AC-06']}
            taskFile="tasks/03-marco.md"
        />
    );
}
