import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function GroupsPage() {
    return (
        <ModulePlaceholderPage
            title="المدرسون، المواد، والمجموعات"
            subtitle="إدارة المواد والمجموعات مع كشف تعارض القاعات والمدرسين تلقائياً"
            owner="Member 2 — George"
            srsRefs={['FR-ORG-03', 'FR-ORG-04', 'FR-ORG-05', 'AC-04']}
            taskFile="tasks/02-george.md"
        />
    );
}
