import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Role-based route guard (Member 1 - Ezzat).
 * Pass allowGuestDev=true only if needed during local UI prototyping before login API is ready.
 */
export function ProtectedRoute({ allowedRoles = null }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-surface-bg text-ink-600">
                جاري التحميل...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
                <h2 className="text-xl font-bold text-ink-900">غير مصرح لك بالوصول</h2>
                <p className="mt-2 text-sm text-ink-600">
                    ليس لديك الصلاحية الكافية لفتح هذه الصفحة.
                </p>
            </div>
        );
    }

    return <Outlet />;
}
