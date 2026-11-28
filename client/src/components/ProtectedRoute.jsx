import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard for authenticated routes (Member 1 - Ezzat).
 * Pass `allowedRoles` to restrict to specific roles; forbidden → /unauthorized.
 */
export function ProtectedRoute({ allowedRoles = null, children = null }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div
                className="flex min-h-screen items-center justify-center bg-surface-bg text-ink-600"
                role="status"
            >
                جاري التحميل...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children ?? <Outlet />;
}

export function RoleProtectedRoute({ allowedRoles = null, children = null }) {
    return <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>;
}
