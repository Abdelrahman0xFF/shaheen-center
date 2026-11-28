import { useCallback, useEffect, useState } from 'react';
import { Building2, Plus, Pencil, CheckCircle2, XCircle, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
    listBranches,
    createBranch,
    updateBranch,
    listRooms,
    createRoom,
    updateRoom,
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
import { failedSubmissionMessage } from '../../utils/submission';
import { useSafeSubmit } from '../../hooks/useSafeSubmit';

const EMPTY_BRANCH = { name: '', address: '', phone: '', isActive: true };
const EMPTY_ROOM = { name: '', capacity: '' };

export function BranchesPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

    const [editing, setEditing] = useState(null); // branch object or {} for create
    const [form, setForm] = useState({ ...EMPTY_BRANCH });
    const [formError, setFormError] = useState('');
    const { submitting: saving, submit: submitBranch } = useSafeSubmit();

    const [roomsBranch, setRoomsBranch] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomForm, setRoomForm] = useState({ ...EMPTY_ROOM });
    const [roomError, setRoomError] = useState('');
    const [editingRoom, setEditingRoom] = useState(null);
    const { submitting: roomSaving, submit: submitRoom } = useSafeSubmit();
    const { submitting: togglingRoom, submit: submitRoomToggle } = useSafeSubmit();

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await listBranches({
                page,
                limit: 20,
                search,
                ...(activeFilter ? { isActive: activeFilter } : {}),
            });
            setItems(res.data || []);
            setMeta(res.meta || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'تعذر جلب الفروع');
        } finally {
            setLoading(false);
        }
    }, [page, search, activeFilter]);

    useEffect(() => {
        load();
    }, [load]);

    async function openRooms(branch) {
        setRoomsBranch(branch);
        setRoomsLoading(true);
        setRoomError('');
        setEditingRoom(null);
        setRoomForm({ ...EMPTY_ROOM });
        try {
            const res = await listRooms(branch.id, { limit: 100 });
            setRooms(res.data || []);
        } catch (err) {
            setRooms([]);
            setRoomError(err?.response?.data?.error?.message || 'تعذر جلب القاعات');
        } finally {
            setRoomsLoading(false);
        }
    }

    async function saveBranch(e) {
        e.preventDefault();
        if (saving) return;
        setFormError('');
        setNotice('');
        setError('');
        if (!form.name.trim()) {
            setFormError('اسم الفرع مطلوب');
            return;
        }
        if (!form.address.trim()) {
            setFormError('العنوان مطلوب');
            return;
        }

        const wasEditing = Boolean(editing?.id);
        const body = {
            name: form.name.trim(),
            address: form.address.trim(),
            phone: form.phone.trim() || null,
            isActive: form.isActive,
        };

        const result = await submitBranch(async () => {
            if (wasEditing) await updateBranch(editing.id, body);
            else await createBranch(body);
        });

        if (!result.submitted) return;

        closeBranchModal();

        if (result.error) {
            // set after `load()` because `load` clears `error`.
        } else {
            setNotice(wasEditing ? 'تم تحديث الفرع' : 'تم إنشاء الفرع');
        }

        await load();
        if (result.error) setError(failedSubmissionMessage(result.error, 'تعذر حفظ الفرع'));
    }

    async function saveRoom(e) {
        e.preventDefault();
        if (roomSaving) return;
        setRoomError('');
        setNotice('');
        setError('');
        const capacity = Number(roomForm.capacity);
        if (!roomForm.name.trim()) {
            setRoomError('اسم القاعة مطلوب');
            return;
        }
        if (!Number.isInteger(capacity) || capacity < 1) {
            setRoomError('السعة غير صالحة');
            return;
        }

        const wasEditing = Boolean(editingRoom?.id);
        const body = { name: roomForm.name.trim(), capacity };

        const result = await submitRoom(async () => {
            if (wasEditing) await updateRoom(editingRoom.id, body);
            else await createRoom(roomsBranch.id, body);
        });

        if (!result.submitted) return;

        // Close the room form + rooms dialog; return to the branch list.
        closeRooms();

        if (result.error) {
            // set after `load()` because `load` clears `error`.
        } else {
            setNotice(wasEditing ? 'تم تحديث القاعة' : 'تم إنشاء القاعة');
        }

        await load();
        if (result.error) setError(failedSubmissionMessage(result.error, 'تعذر حفظ القاعة'));
    }

    async function toggleRoom(room) {
        setRoomError('');
        const result = await submitRoomToggle(async () => {
            await updateRoom(room.id, { isActive: !room.isActive });
        });
        if (result.error) {
            setRoomError(safeMessage(result.error, 'تعذر تحديث القاعة'));
            return;
        }
        await openRooms(roomsBranch);
    }

    function safeMessage(error, fallback) {
        const message = error?.response?.data?.error?.message;
        return typeof message === 'string' && message.trim() ? message.trim() : fallback;
    }

    function closeBranchModal() {
        setEditing(null);
        setForm({ ...EMPTY_BRANCH });
        setFormError('');
    }

    function closeRooms() {
        setRoomsBranch(null);
        setRooms([]);
        setEditingRoom(null);
        setRoomForm({ ...EMPTY_ROOM });
        setRoomError('');
        setRoomsLoading(false);
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="الفروع والقاعات"
                subtitle="إدارة الفروع والقاعات التعليمية"
                actions={
                    isAdmin ? (
                        <Button
                            onClick={() => {
                                setForm({ ...EMPTY_BRANCH });
                                setFormError('');
                                setEditing({});
                            }}
                        >
                            <Plus className="h-4 w-4" /> إضافة فرع
                        </Button>
                    ) : null
                }
            />

            <Card padding="p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <Input
                        label="بحث"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="ابحث بالاسم أو العنوان"
                    />
                    <Select
                        label="الحالة"
                        value={activeFilter}
                        onChange={(e) => {
                            setActiveFilter(e.target.value);
                            setPage(1);
                        }}
                        options={[
                            { value: '', label: 'الكل' },
                            { value: 'true', label: 'نشط' },
                            { value: 'false', label: 'غير نشط' },
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
                <EmptyState
                    icon={Building2}
                    title="لا توجد فروع"
                    description="لا توجد فروع مطابقة."
                />
            ) : (
                <Card padding="p-0">
                    <Table>
                        <thead>
                            <tr>
                                <th>الاسم</th>
                                <th>العنوان</th>
                                <th>الهاتف</th>
                                <th>القاعات</th>
                                <th>الحالة</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((b) => (
                                <tr key={b.id}>
                                    <td className="font-semibold">{b.name}</td>
                                    <td>{b.address}</td>
                                    <td dir="ltr" className="tabular-nums">
                                        {b.phone || '—'}
                                    </td>
                                    <td>{b._count?.rooms ?? 0}</td>
                                    <td>
                                        {b.isActive ? (
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
                                                onClick={() => openRooms(b)}
                                            >
                                                <Layers className="h-3.5 w-3.5" /> قاعات
                                            </Button>
                                            {isAdmin && (
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setForm({
                                                            name: b.name,
                                                            address: b.address,
                                                            phone: b.phone || '',
                                                            isActive: b.isActive,
                                                        });
                                                        setFormError('');
                                                        setEditing(b);
                                                    }}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" /> تعديل
                                                </Button>
                                            )}
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

            {/* Branch create/edit */}
            <Modal
                open={editing !== null}
                onClose={closeBranchModal}
                title={editing?.id ? 'تعديل فرع' : 'إضافة فرع'}
            >
                <form onSubmit={saveBranch} className="space-y-3" noValidate>
                    <Input
                        label="الاسم"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                    />
                    <Input
                        label="العنوان"
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        required
                    />
                    <Input
                        label="الهاتف"
                        dir="ltr"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    {formError && (
                        <p role="alert" className="text-xs font-medium text-status-due">
                            {formError}
                        </p>
                    )}
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={closeBranchModal}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Rooms */}
            <Modal
                open={roomsBranch !== null}
                onClose={closeRooms}
                title={`قاعات — ${roomsBranch?.name || ''}`}
            >
                <div className="space-y-3">
                    {roomsLoading ? (
                        <p role="status" className="text-sm text-ink-600">
                            جاري التحميل...
                        </p>
                    ) : rooms.length === 0 ? (
                        <p className="text-sm text-ink-600">لا توجد قاعات.</p>
                    ) : (
                        <ul className="divide-y divide-surface-border">
                            {rooms.map((r) => (
                                <li
                                    key={r.id}
                                    className="flex items-center justify-between py-2 text-sm"
                                >
                                    <span className="font-semibold">{r.name}</span>
                                    <span className="text-ink-600">السعة {r.capacity}</span>
                                    <Badge variant={r.isActive ? 'success' : 'neutral'}>
                                        {r.isActive ? 'نشط' : 'غير نشط'}
                                    </Badge>
                                    <div className="flex gap-1.5">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setEditingRoom(r);
                                                setRoomError('');
                                                setRoomForm({
                                                    name: r.name,
                                                    capacity: String(r.capacity),
                                                });
                                            }}
                                        >
                                            تعديل
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            disabled={togglingRoom}
                                            onClick={() => toggleRoom(r)}
                                        >
                                            {r.isActive ? 'تعطيل' : 'تفعيل'}
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {(isAdmin || user?.role === 'BRANCH_MANAGER') && (
                        <form
                            onSubmit={saveRoom}
                            className="flex flex-wrap items-end gap-2 border-t border-surface-border pt-3"
                            noValidate
                        >
                            <Input
                                label="اسم القاعة"
                                value={roomForm.name}
                                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                            />
                            <Input
                                label="السعة"
                                type="number"
                                min="1"
                                value={roomForm.capacity}
                                onChange={(e) =>
                                    setRoomForm({ ...roomForm, capacity: e.target.value })
                                }
                            />
                            <Button type="submit" disabled={roomSaving}>
                                {editingRoom ? 'حفظ التعديل' : 'إضافة قاعة'}
                            </Button>
                            {editingRoom && (
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setEditingRoom(null);
                                        setRoomForm({ ...EMPTY_ROOM });
                                        setRoomError('');
                                    }}
                                >
                                    إلغاء
                                </Button>
                            )}
                        </form>
                    )}
                    {roomError && (
                        <p role="alert" className="text-xs font-medium text-status-due">
                            {roomError}
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    );
}
