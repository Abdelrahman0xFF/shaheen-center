import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function BranchesPage() {
    return (
        <ModulePlaceholderPage
            title="الفروع والقاعات"
            subtitle="إدارة فروع السنتر والقاعات وسعتها الاستيعابية"
            owner="Member 1 — Ezzat"
            srsRefs={['FR-ORG-01', 'FR-ORG-02', 'FR-AUTH-04']}
            taskFile="tasks/01-ezzat.md"
        />
    );
}
