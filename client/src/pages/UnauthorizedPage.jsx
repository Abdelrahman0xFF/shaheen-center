import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { roleLanding } from '../config/routeAccess';
import { Card, Button } from '../components/ui';

/** Arabic 403 page (A5). */
export function UnauthorizedPage() {
    const { user } = useAuth();
    const location = useLocation();

    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

    return (
        <div
            className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center"
            role="alert"
        >
            <ShieldAlert className="mb-3 h-12 w-12 text-status-due" aria-hidden="true" />
            <h1 className="text-xl font-bold text-ink-900">غير مصرح لك بالوصول</h1>
            <p className="mt-2 text-sm text-ink-600">ليس لديك الصلاحية الكافية لفتح هذه الصفحة.</p>
            <Card className="mt-4 w-full max-w-sm" padding="p-4">
                <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                        window.location.assign(roleLanding(user.role));
                    }}
                >
                    العودة للصفحة الرئيسية
                </Button>
            </Card>
        </div>
    );
}
