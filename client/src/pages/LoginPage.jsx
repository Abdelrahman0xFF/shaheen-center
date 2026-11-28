import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { canAccessPath, roleLanding } from '../config/routeAccess';
import { Button, Card, Input } from '../components/ui';

/**
 * Member 1 (Ezzat) — Login Page (FR-AUTH-01, FR-AUTH-07).
 * Arabic RTL layout. Only in-memory access tokens are used; refresh tokens
 * live exclusively in an HttpOnly cookie managed by the backend.
 */
export function LoginPage() {
    const { login, sessionExpired } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function validate() {
        const nextErrors = {};

        if (!identifier.trim()) {
            nextErrors.identifier = 'أدخل رقم الموبايل أو البريد الإلكتروني';
        }

        if (!password) {
            nextErrors.password = 'أدخل كلمة المرور';
        }

        setFieldErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!validate()) return;

        setSubmitting(true);
        try {
            const user = await login({ identifier: identifier.trim(), password });
            const role = user?.role;
            const from = location.state?.from?.pathname;
            const destination = from && canAccessPath(role, from) ? from : roleLanding(role);
            navigate(destination, { replace: true });
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'تعذر تسجيل الدخول، تحقق من البيانات');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface-bg p-4">
            <Card className="w-full max-w-md" padding="p-6 sm:p-8">
                <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-extrabold text-white shadow-sm">
                        ش
                    </div>
                    <h1 className="text-2xl font-extrabold text-ink-900">سنتر شاهين</h1>
                    <p className="mt-1 text-sm text-ink-600">تسجيل الدخول إلى نظام الإدارة</p>
                </div>

                {(sessionExpired || location.state?.sessionExpired) && (
                    <div
                        role="alert"
                        className="mb-4 rounded-lg border border-status-due/25 bg-status-due-bg px-3.5 py-2.5 text-sm font-medium text-status-due-text"
                    >
                        انتهت صلاحية الجلسة، سجّل الدخول مرة أخرى.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                    <Input
                        label="رقم الموبايل أو البريد الإلكتروني"
                        name="identifier"
                        dir="ltr"
                        placeholder="01000000000 أو name@example.com"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        error={fieldErrors.identifier}
                        autoComplete="username"
                        required
                    />

                    <div className="relative space-y-1.5">
                        <label
                            htmlFor="password"
                            className="block text-sm font-semibold text-ink-700"
                        >
                            كلمة المرور
                        </label>
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                            className={`w-full min-h-[44px] rounded-lg border bg-surface-card pe-10 px-3.5 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                                fieldErrors.password ? 'border-status-due' : 'border-surface-border'
                            }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((value) => !value)}
                            aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                            className="absolute end-2 top-[2.15rem] inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-500 hover:text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" aria-hidden="true" />
                            ) : (
                                <Eye className="h-4 w-4" aria-hidden="true" />
                            )}
                        </button>
                        {fieldErrors.password ? (
                            <p className="text-xs font-medium text-status-due">
                                {fieldErrors.password}
                            </p>
                        ) : null}
                    </div>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-lg border border-status-due/25 bg-status-due-bg px-3.5 py-2.5 text-sm font-medium text-status-due-text"
                        >
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={submitting}>
                        <Lock className="h-4 w-4" />
                        <span>{submitting ? 'جاري التحقق...' : 'دخول'}</span>
                    </Button>
                </form>
            </Card>
        </div>
    );
}
