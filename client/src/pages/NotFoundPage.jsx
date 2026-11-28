import { Link } from 'react-router-dom';
import { roleLanding } from '../config/routeAccess';
import { useAuth } from '../context/AuthContext';

/** Arabic 404 page; does not redirect to a page the role can't access. */
export function NotFoundPage() {
    const { user } = useAuth();
    const home = user ? roleLanding(user.role) : '/login';

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
            <h1 className="text-2xl font-bold text-ink-900">الصفحة غير موجودة</h1>
            <p className="mt-2 text-sm text-ink-600">الرابط الذي طلبته غير متاح.</p>
            <Link to={home} className="mt-4 text-sm font-semibold text-brand-700 hover:underline">
                العودة للصفحة الرئيسية
            </Link>
        </div>
    );
}
