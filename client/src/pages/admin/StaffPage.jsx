import { ModulePlaceholderPage } from '../ModulePlaceholderPage';

export function StaffPage() {
    return (
        <ModulePlaceholderPage
            title="الموظفون والصلاحيات"
            subtitle="إنشاء وتعطيل حسابات الموظفين وتعيين الفروع وإعادة تعيين كلمات المرور"
            owner="Member 1 — Ezzat"
            srsRefs={['FR-AUTH-03', 'FR-AUTH-04', 'FR-AUTH-05']}
            taskFile="tasks/01-ezzat.md"
        />
    );
}
