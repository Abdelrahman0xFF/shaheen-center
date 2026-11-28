import { Card, PageHeader } from '../components/ui';
import { useAuth } from '../context/AuthContext';

/** Minimal student landing page (A6 / route `/my`). */
export function StudentHomePage() {
    const { user } = useAuth();

    return (
        <div className="space-y-4">
            <PageHeader title="حسابي" subtitle="مرحباً بك في سنتر شاهين" />
            <Card padding="p-5">
                <p className="text-sm text-ink-600">الاسم</p>
                <p className="text-lg font-bold text-ink-900">{user?.name || '—'}</p>
                <p className="mt-3 text-sm text-ink-600">
                    بياناتك الدراسية والحضور والمدفوعات تتم إدارتها من قبل السنتر.
                </p>
            </Card>
        </div>
    );
}
