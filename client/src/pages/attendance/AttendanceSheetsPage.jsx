import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function AttendanceSheetsPage() {
    return (
        <ModulePlaceholderPage
            title="كشوف الحضور والغياب"
            subtitle="متابعة حضور الحصص، التحضير اليدوي مع السبب، وإغلاق الحصة لتسجيل الغياب"
            owner="Member 4 — Mazen"
            srsRefs={['FR-ATT-04', 'FR-ATT-06', 'FR-ATT-07', 'FR-ATT-08']}
            taskFile="tasks/04-mazen.md"
        />
    );
}
