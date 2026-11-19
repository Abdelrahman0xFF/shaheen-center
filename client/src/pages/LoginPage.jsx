import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button, Card, Input } from '../components/ui';

/**
 * Member 1 (Ezzat) — Login Page Base (FR-AUTH-01, FR-AUTH-07).
 */
export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await login({ identifier, password });
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error?.message || 'تعذر تسجيل الدخول، تحقق من البيانات');
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

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="رقم الموبايل أو اسم المستخدم"
                        name="identifier"
                        dir="ltr"
                        placeholder="01000000000"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                    />

                    <Input
                        label="كلمة المرور"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    {error && (
                        <div className="rounded-lg border border-status-due/25 bg-status-due-bg px-3.5 py-2.5 text-sm font-medium text-status-due-text">
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
