import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function AuditLogsPage() {
    return (
        <ModulePlaceholderPage
            title="سجل المراقبة (Audit Log)"
            subtitle="سجل غير قابل للتعديل لكافة العمليات الحساسة (للأدمن فقط)"
            owner="Member 1 — Ezzat"
            srsRefs={['FR-RPT-02', 'FR-RPT-03', 'NFR-DAT-03']}
            taskFile="tasks/01-ezzat.md"
        />
    );
}
