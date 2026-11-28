import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, CheckCircle2, XCircle, KeyRound, Users } from 'lucide-react';
import {
    listStaff,
    createStaff,
    updateStaff,
    toggleStaffStatus,
    resetStaffPassword,
    listBranches,
} from '../../api/admin';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Input,
    Modal,
    PageHeader,
    Select,
    Table,
} from '../../components/ui';
import { ROLE_LABELS_AR } from '../../utils/formatters';
import { failedSubmissionMessage } from '../../utils/submission';
import { useSafeSubmit } from '../../hooks/useSafeSubmit';

const EMPTY = { name: '', phone: '', username: '', password: '', role: 'SECRETARY', branchIds: [] };

export function StaffPage() {
    const [items, setItems] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [branchFilter, setBranchFilter] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ ...EMPTY });
    const [formError, setFormError] = useState('');
    const { submitting: saving, submit: submitStaff } = useSafeSubmit();

    const [resetFor, setResetFor] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resetError, setResetError] = useState('');
    const { submitting: resetSaving, submit: submitReset } = useSafeSubmit();

    const [confirmToggle, setConfirmToggle] = useState(null);
    const { submitting: toggleSaving, submit: submitToggle } = useSafeSubmit();

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: 20, search };
            if (roleFilter) params.role = roleFilter;
            if (statusFilter) params.isActive = statusFilter;
            if (branchFilter) params.branchId = branchFilter;
            const res = await listStaff(params);
            setItems(res.data || []);
            setMeta(res.meta || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'تعذر جلب الموظفين');
        } finally {
            setLoading(false);
        }
    }, [page, search, roleFilter, statusFilter, branchFilter]);

    useEffect(() => {
        load();
    }, [load]);
    useEffect(() => {
        listBranches({ limit: 100 })
            .then((r) => setBranches(r.data || []))
            .catch(() => setBranches([]));
    }, []);

    function toggleBranch(id) {
        setForm((f) => ({
            ...f,
            branchIds: f.branchIds.includes(id)
                ? f.branchIds.filter((x) => x !== id)
                : [...f.branchIds, id],
        }));
    }

    async function saveStaff(e) {
        e.preventDefault();
        if (saving) return;
        setFormError('');
        setNotice('');
        setError('');
        if (!form.name.trim()) {
            setFormError('الاسم مطلوب');
            return;
        }
        if (!form.phone.trim()) {
            setFormError('رقم الموبايل مطلوب');
            return;
        }
        if (form.branchIds.length === 0) {
            setFormError('اختر فرعاً واحداً على الأقل');
            return;
        }
        const username = form.username.trim().toLowerCase();
        if (username && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
            setFormError('البريد الإلكتروني غير صالح');
            return;
        }
        if (!editing?.id && (form.password || '').length < 12) {
            setFormError('كلمة المرور يجب أن تكون 12 حرفاً على الأقل');
            return;
        }

        const wasEditing = Boolean(editing?.id);
        const body = {
            name: form.name.trim(),
            phone: form.phone.trim(),
            username: username || null,
            role: form.role,
            branchIds: form.branchIds,
        };

        const result = await submitStaff(async () => {
            if (wasEditing) await updateStaff(editing.id, body);
            else await createStaff({ ...body, password: form.password });
        });

        if (!result.submitted) return;

        closeStaffModal();

        if (result.error) {
            // set after `load()` because `load` clears `error`.
        } else {
            setNotice(wasEditing ? 'تم تحديث الموظف' : 'تم إنشاء الموظف');
        }

        await load();
        if (result.error) setError(failedSubmissionMessage(result.error, 'تعذر حفظ الموظف'));
    }

    async function doToggle(member, isActive) {
        if (toggleSaving) return;
        setNotice('');
        setError('');
        const result = await submitToggle(async () => {
            await toggleStaffStatus(member.id, isActive);
        });

        if (!result.submitted) return;

        closeConfirmToggle();

        if (result.error) {
            // set after `load()` because `load` clears `error`.
        } else {
            setNotice(isActive ? 'تم تفعيل الموظف' : 'تم تعطيل الموظف');
        }

        await load();
        if (result.error) setError(failedSubmissionMessage(result.error, 'تعذر تحديث الحالة'));
    }

    async function doReset(e) {
        e.preventDefault();
        if (resetSaving) return;
        setResetError('');
        setNotice('');
        setError('');
        if ((newPassword || '').length < 12) {
            setResetError('كلمة المرور يجب أن تكون 12 حرفاً على الأقل');
            return;
        }

        const result = await submitReset(async () => {
            await resetStaffPassword(resetFor.id, newPassword);
        });

        if (!result.submitted) return;

        closeReset();

        if (result.error) {
            // set after `load()` because `load` clears `error`.
        } else {
            setNotice('تم إعادة تعيين كلمة المرور');
        }

        await load();
        if (result.error)
            setError(failedSubmissionMessage(result.error, 'تعذر إعادة تعيين كلمة المرور'));
    }

    function closeStaffModal() {
        setEditing(null);
        setForm({ ...EMPTY });
        setFormError('');
    }

    function closeReset() {
        setResetFor(null);
        setNewPassword('');
        setResetError('');
        setShowPassword(false);
    }

    function closeConfirmToggle() {
        setConfirmToggle(null);
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="الموظفون والصلاحيات"
                subtitle="إدارة مدراء الفروع والسكرتارية"
                actions={
                    <Button
                        onClick={() => {
                            setForm({ ...EMPTY });
                            setFormError('');
                            setEditing({});
                        }}
                    >
                        <Plus className="h-4 w-4" /> إضافة موظف
                    </Button>
                }
            />

            <Card padding="p-4">
                <div className="flex flex-wrap gap-3">
                    <Input
                        label="بحث"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="اسم / هاتف / مستخدم"
                    />
                    <Select
                        label="الدور"
                        value={roleFilter}
                        onChange={(e) => {
                            setRoleFilter(e.target.value);
                            setPage(1);
                        }}
                        options={[
                            { value: '', label: 'الكل' },
                            { value: 'BRANCH_MANAGER', label: ROLE_LABELS_AR.BRANCH_MANAGER },
                            { value: 'SECRETARY', label: ROLE_LABELS_AR.SECRETARY },
                        ]}
                    />
                    <Select
                        label="الحالة"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                        options={[
                            { value: '', label: 'الكل' },
                            { value: 'true', label: 'نشط' },
                            { value: 'false', label: 'غير نشط' },
                        ]}
                    />
                    <Select
                        label="الفرع"
                        value={branchFilter}
                        onChange={(e) => {
                            setBranchFilter(e.target.value);
                            setPage(1);
                        }}
                        options={[
                            { value: '', label: 'كل الفروع' },
                            ...branches.map((b) => ({ value: b.id, label: b.name })),
                        ]}
                    />
                </div>
            </Card>

            {notice && (
                <div
                    role="status"
                    className="rounded-lg border border-status-paid/25 bg-status-paid-bg px-3.5 py-2.5 text-sm font-medium text-status-paid-text"
                >
                    {notice}
                </div>
            )}

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-status-due/25 bg-status-due-bg px-3.5 py-2.5 text-sm font-medium text-status-due-text"
                >
                    {error}
                </div>
            )}

            {loading ? (
                <p role="status" className="text-sm text-ink-600">
                    جاري التحميل...
                </p>
            ) : items.length === 0 ? (
                <EmptyState icon={Users} title="لا يوجد موظفون" />
            ) : (
                <Card padding="p-0">
                    <Table>
                        <thead>
                            <tr>
                                <th>الاسم</th>
                                <th>الدور</th>
                                <th>الهاتف</th>
                                <th>الفروع</th>
                                <th>الحالة</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((m) => (
                                <tr key={m.id}>
                                    <td className="font-semibold">{m.name}</td>
                                    <td>{ROLE_LABELS_AR[m.role] || m.role}</td>
                                    <td dir="ltr" className="tabular-nums">
                                        {m.phone}
                                    </td>
                                    <td>
                                        {(m.branches || []).map((b) => b.name).join('، ') || '—'}
                                    </td>
                                    <td>
                                        {m.isActive ? (
                                            <Badge variant="paid">
                                                <CheckCircle2 className="h-3 w-3" /> نشط
                                            </Badge>
                                        ) : (
                                            <Badge variant="neutral">
                                                <XCircle className="h-3 w-3" /> غير نشط
                                            </Badge>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex flex-wrap gap-1.5">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setForm({
                                                        name: m.name,
                                                        phone: m.phone,
                                                        username: m.username || '',
                                                        password: '',
                                                        role: m.role,
                                                        branchIds: m.branchIds || [],
                                                    });
                                                    setFormError('');
                                                    setEditing(m);
                                                }}
                                            >
                                                <Pencil className="h-3.5 w-3.5" /> تعديل
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() =>
                                                    setConfirmToggle({
                                                        member: m,
                                                        isActive: !m.isActive,
                                                    })
                                                }
                                            >
                                                {m.isActive ? 'تعطيل' : 'تفعيل'}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setResetFor(m);
                                                    setNewPassword('');
                                                    setResetError('');
                                                    setShowPassword(false);
                                                }}
                                            >
                                                <KeyRound className="h-3.5 w-3.5" /> كلمة المرور
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
            )}

            {meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                    >
                        السابق
                    </Button>
                    <span className="text-sm text-ink-600">
                        صفحة {meta.page} من {meta.totalPages}
                    </span>
                    <Button
                        variant="secondary"
                        size="sm"
                        disabled={page >= meta.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        التالي
                    </Button>
                </div>
            )}

            <Modal
                open={editing !== null}
                onClose={closeStaffModal}
                title={editing?.id ? 'تعديل موظف' : 'إضافة موظف'}
            >
                <form onSubmit={saveStaff} className="space-y-3" noValidate>
                    <Input
                        label="الاسم"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <Input
                        label="الهاتف"
                        dir="ltr"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        required
                    />
                    <Input
                        label="البريد الإلكتروني / Email"
                        type="email"
                        dir="ltr"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        hint="اختياري. بدون بريد إلكتروني لا يمكن تسجيل الدخول بالبريد وكلمة المرور حتى يُعيَّن بريد."
                        autoComplete="email"
                    />
                    <Select
                        label="الدور"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        options={[
                            { value: 'SECRETARY', label: ROLE_LABELS_AR.SECRETARY },
                            { value: 'BRANCH_MANAGER', label: ROLE_LABELS_AR.BRANCH_MANAGER },
                        ]}
                    />
                    {!editing?.id && (
                        <Input
                            label="كلمة المرور"
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                        />
                    )}
                    <fieldset className="space-y-1">
                        <legend className="block text-sm font-semibold text-ink-700">الفروع</legend>
                        {branches.map((b) => (
                            <label key={b.id} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.branchIds.includes(b.id)}
                                    onChange={() => toggleBranch(b.id)}
                                />
                                {b.name}
                            </label>
                        ))}
                    </fieldset>
                    {formError && (
                        <p role="alert" className="text-xs font-medium text-status-due">
                            {formError}
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={closeStaffModal}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal open={confirmToggle !== null} onClose={closeConfirmToggle} title="تأكيد">
                <p className="text-sm text-ink-700">
                    {confirmToggle?.isActive ? 'تفعيل' : 'تعطيل'} هذا الموظف؟
                </p>
                <div className="mt-3 flex justify-end gap-2">
                    <Button variant="secondary" onClick={closeConfirmToggle}>
                        إلغاء
                    </Button>
                    <Button
                        variant="danger"
                        disabled={toggleSaving}
                        onClick={() => doToggle(confirmToggle.member, confirmToggle.isActive)}
                    >
                        تأكيد
                    </Button>
                </div>
            </Modal>

            <Modal open={resetFor !== null} onClose={closeReset} title="إعادة تعيين كلمة المرور">
                <form onSubmit={doReset} className="space-y-3" noValidate>
                    <div className="relative">
                        <Input
                            label="كلمة المرور الجديدة"
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            aria-label={showPassword ? 'إخفاء' : 'إظهار'}
                            className="absolute end-2 top-[2.1rem] text-ink-500"
                            onClick={() => setShowPassword((v) => !v)}
                        >
                            {showPassword ? 'إخفاء' : 'إظهار'}
                        </button>
                    </div>
                    {resetError && (
                        <p role="alert" className="text-xs font-medium text-status-due">
                            {resetError}
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={closeReset}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={resetSaving}>
                            {resetSaving ? 'جاري الحفظ...' : 'تأكيد'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
