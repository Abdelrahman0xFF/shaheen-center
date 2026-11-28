import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Plus, Trash2, CheckCircle2, XCircle, Settings } from 'lucide-react';
import {
    getSettings,
    updateSettings,
    listTerms,
    createTerm,
    updateTerm,
    listHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday,
} from '../../api/admin';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Input,
    Modal,
    PageHeader,
    Table,
} from '../../components/ui';
import { formatDateCairo } from '../../utils/formatters';
import { failedSubmissionMessage, safeSubmissionMessage } from '../../utils/submission';
import { useSafeSubmit } from '../../hooks/useSafeSubmit';

const WORKING_DAYS = [
    { d: 0, label: 'الأحد' },
    { d: 1, label: 'الاثنين' },
    { d: 2, label: 'الثلاثاء' },
    { d: 3, label: 'الأربعاء' },
    { d: 4, label: 'الخميس' },
    { d: 5, label: 'الجمعة' },
    { d: 6, label: 'السبت' },
];

const EMPTY_TERM = { name: '', year: '', startDate: '', endDate: '', isActive: true };
const EMPTY_HOLIDAY = { name: '', date: '', termId: '', isExceptional: false };

export function SettingsPage() {
    const [tab, setTab] = useState('general');
    const [settings, setSettings] = useState(null);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const [terms, setTerms] = useState([]);
    const [holidays, setHolidays] = useState([]);
    const [termModal, setTermModal] = useState(null);
    const [holidayModal, setHolidayModal] = useState(null);
    const [termForm, setTermForm] = useState({ ...EMPTY_TERM });
    const [holidayForm, setHolidayForm] = useState({ ...EMPTY_HOLIDAY });
    const { submitting: termSaving, submit: submitTerm } = useSafeSubmit();
    const { submitting: holidaySaving, submit: submitHoliday } = useSafeSubmit();
    const { submitting: deletingHoliday, submit: submitDeleteHoliday } = useSafeSubmit();
    const [confirmDelete, setConfirmDelete] = useState(null);

    const loadSettings = useCallback(async () => {
        try {
            const r = await getSettings();
            setSettings(r.data);
        } catch (err) {
            setSettings(null);
            setError(err?.response?.data?.error?.message || 'تعذر جلب الإعدادات');
        }
    }, []);
    const loadCalendar = useCallback(async () => {
        try {
            const [t, h] = await Promise.all([
                listTerms({ limit: 100 }),
                listHolidays({ limit: 100 }),
            ]);
            setTerms(t.data || []);
            setHolidays(h.data || []);
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'تعذر جلب بيانات التقويم');
        }
    }, []);

    useEffect(() => {
        loadSettings();
        loadCalendar();
    }, [loadSettings, loadCalendar]);

    async function saveSettings(e) {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setNotice('');
        setError('');
        try {
            await updateSettings({
                center_name: settings.center_name,
                late_threshold_minutes: Number(settings.late_threshold_minutes),
                absence_alert_minutes: Number(settings.absence_alert_minutes),
                working_days: settings.working_days,
            });
            setNotice('تم حفظ الإعدادات');
            await loadSettings();
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'تعذر الحفظ');
        } finally {
            setSaving(false);
        }
    }

    function toggleDay(d) {
        setSettings((s) => ({
            ...s,
            working_days: s.working_days.includes(d)
                ? s.working_days.filter((x) => x !== d)
                : [...s.working_days, d],
        }));
    }

    async function saveTerm(e) {
        e.preventDefault();
        if (termSaving) return;
        setError('');
        setNotice('');

        const wasEditing = Boolean(termModal?.id);
        const body = {
            name: termForm.name.trim(),
            year: termForm.year.trim(),
            startDate: termForm.startDate,
            endDate: termForm.endDate,
            isActive: termForm.isActive,
        };

        const result = await submitTerm(async () => {
            if (wasEditing) await updateTerm(termModal.id, body);
            else await createTerm(body);
        });

        if (!result.submitted) return;

        // Close + reset on BOTH success and backend failure; never show a rejected record.
        closeTermModal();

        if (result.error) {
            setError(failedSubmissionMessage(result.error, 'تعذر حفظ الفصل'));
        } else {
            setNotice(wasEditing ? 'تم تحديث الفصل' : 'تم إنشاء الفصل');
        }

        await loadCalendar();
    }

    async function saveHoliday(e) {
        e.preventDefault();
        if (holidaySaving) return;
        setError('');
        setNotice('');

        const wasEditing = Boolean(holidayModal?.id);
        const body = {
            name: holidayForm.name.trim(),
            date: holidayForm.date,
            termId: holidayForm.termId || null,
            isExceptional: holidayForm.isExceptional,
        };

        const result = await submitHoliday(async () => {
            if (wasEditing) await updateHoliday(holidayModal.id, body);
            else await createHoliday(body);
        });

        if (!result.submitted) return;

        closeHolidayModal();

        if (result.error) {
            setError(failedSubmissionMessage(result.error, 'تعذر حفظ الإجازة'));
        } else {
            setNotice(wasEditing ? 'تم تحديث الإجازة' : 'تم إنشاء الإجازة');
        }

        await loadCalendar();
    }

    function closeTermModal() {
        setTermModal(null);
        setTermForm({ ...EMPTY_TERM });
    }

    function closeHolidayModal() {
        setHolidayModal(null);
        setHolidayForm({ ...EMPTY_HOLIDAY });
    }

    async function removeHoliday(id) {
        setNotice('');
        setError('');
        const result = await submitDeleteHoliday(async () => {
            await deleteHoliday(id);
        });

        if (!result.submitted) return;

        setConfirmDelete(null);
        if (result.error) {
            setError(failedSubmissionMessage(result.error, 'تعذر حذف الإجازة'));
        } else {
            setNotice('تم حذف الإجازة');
        }
        await loadCalendar();
    }

    return (
        <div className="space-y-4">
            <PageHeader
                title="التقويم والإعدادات"
                subtitle="إعدادات السنتر والفصول الدراسية والإجازات"
            />

            <div className="flex flex-wrap gap-2" role="tablist">
                <Button
                    variant={tab === 'general' ? 'primary' : 'secondary'}
                    size="sm"
                    role="tab"
                    aria-selected={tab === 'general'}
                    onClick={() => setTab('general')}
                >
                    الإعدادات العامة
                </Button>
                <Button
                    variant={tab === 'terms' ? 'primary' : 'secondary'}
                    size="sm"
                    role="tab"
                    aria-selected={tab === 'terms'}
                    onClick={() => setTab('terms')}
                >
                    الفصول الدراسية
                </Button>
                <Button
                    variant={tab === 'holidays' ? 'primary' : 'secondary'}
                    size="sm"
                    role="tab"
                    aria-selected={tab === 'holidays'}
                    onClick={() => setTab('holidays')}
                >
                    الإجازات
                </Button>
            </div>

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

            {tab === 'general' && settings && (
                <Card padding="p-5">
                    <form onSubmit={saveSettings} className="space-y-4" noValidate>
                        <Input
                            label="اسم السنتر"
                            value={settings.center_name}
                            onChange={(e) =>
                                setSettings({ ...settings, center_name: e.target.value })
                            }
                        />
                        <Input
                            label="دقائق التأخير المسموحة"
                            type="number"
                            min="0"
                            max="120"
                            value={settings.late_threshold_minutes}
                            onChange={(e) =>
                                setSettings({ ...settings, late_threshold_minutes: e.target.value })
                            }
                        />
                        <Input
                            label="دقائق تنبيه الغياب"
                            type="number"
                            min="0"
                            max="120"
                            value={settings.absence_alert_minutes}
                            onChange={(e) =>
                                setSettings({ ...settings, absence_alert_minutes: e.target.value })
                            }
                        />
                        <fieldset className="space-y-1">
                            <legend className="block text-sm font-semibold text-ink-700">
                                أيام العمل
                            </legend>
                            <div className="flex flex-wrap gap-3">
                                {WORKING_DAYS.map(({ d, label }) => (
                                    <label key={d} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={settings.working_days.includes(d)}
                                            onChange={() => toggleDay(d)}
                                        />{' '}
                                        {label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        <div className="text-sm text-ink-600">
                            العملة: <strong>EGP (ج.م)</strong> · التوقيت:{' '}
                            <strong dir="ltr">Africa/Cairo</strong>
                        </div>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                    </form>
                </Card>
            )}

            {tab === 'terms' && (
                <Card padding="p-4">
                    <div className="mb-3 flex justify-end">
                        <Button
                            size="sm"
                            onClick={() => {
                                setTermForm({
                                    name: '',
                                    year: '',
                                    startDate: '',
                                    endDate: '',
                                    isActive: true,
                                });
                                setTermModal({});
                            }}
                        >
                            <Plus className="h-4 w-4" /> إضافة فصل
                        </Button>
                    </div>
                    {terms.length === 0 ? (
                        <EmptyState icon={CalendarDays} title="لا توجد فصول دراسية" />
                    ) : (
                        <Table>
                            <thead>
                                <tr>
                                    <th>الاسم</th>
                                    <th>السنة</th>
                                    <th>البداية</th>
                                    <th>النهاية</th>
                                    <th>الحالة</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {terms.map((t) => (
                                    <tr key={t.id}>
                                        <td className="font-semibold">{t.name}</td>
                                        <td>{t.year}</td>
                                        <td>{formatDateCairo(t.startDate)}</td>
                                        <td>{formatDateCairo(t.endDate)}</td>
                                        <td>
                                            {t.isActive ? (
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
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => {
                                                    setTermForm({
                                                        name: t.name,
                                                        year: t.year,
                                                        startDate: t.startDate?.slice(0, 10) || '',
                                                        endDate: t.endDate?.slice(0, 10) || '',
                                                        isActive: t.isActive,
                                                    });
                                                    setTermModal(t);
                                                }}
                                            >
                                                تعديل
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card>
            )}

            {tab === 'holidays' && (
                <Card padding="p-4">
                    <div className="mb-3 flex justify-end">
                        <Button
                            size="sm"
                            onClick={() => {
                                setHolidayForm({
                                    name: '',
                                    date: '',
                                    termId: '',
                                    isExceptional: false,
                                });
                                setHolidayModal({});
                            }}
                        >
                            <Plus className="h-4 w-4" /> إضافة إجازة
                        </Button>
                    </div>
                    {holidays.length === 0 ? (
                        <EmptyState icon={CalendarDays} title="لا توجد إجازات" />
                    ) : (
                        <Table>
                            <thead>
                                <tr>
                                    <th>الاسم</th>
                                    <th>التاريخ</th>
                                    <th>استثنائية</th>
                                    <th>إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holidays.map((h) => (
                                    <tr key={h.id}>
                                        <td className="font-semibold">{h.name}</td>
                                        <td>{formatDateCairo(h.date)}</td>
                                        <td>{h.isExceptional ? 'نعم' : 'لا'}</td>
                                        <td>
                                            <div className="flex gap-1.5">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => {
                                                        setHolidayForm({
                                                            name: h.name,
                                                            date: h.date?.slice(0, 10) || '',
                                                            termId: h.termId || '',
                                                            isExceptional: h.isExceptional,
                                                        });
                                                        setHolidayModal(h);
                                                    }}
                                                >
                                                    تعديل
                                                </Button>
                                                <Button
                                                    variant="danger"
                                                    size="sm"
                                                    aria-label="حذف الإجازة"
                                                    onClick={() => setConfirmDelete(h.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card>
            )}

            <Modal
                open={termModal !== null}
                onClose={closeTermModal}
                title={termModal?.id ? 'تعديل فصل' : 'إضافة فصل'}
            >
                <form onSubmit={saveTerm} className="space-y-3" noValidate>
                    <Input
                        label="الاسم"
                        value={termForm.name}
                        onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                        required
                    />
                    <Input
                        label="السنة"
                        value={termForm.year}
                        onChange={(e) => setTermForm({ ...termForm, year: e.target.value })}
                        required
                    />
                    <Input
                        label="تاريخ البداية"
                        type="date"
                        value={termForm.startDate}
                        onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                        required
                    />
                    <Input
                        label="تاريخ النهاية"
                        type="date"
                        value={termForm.endDate}
                        onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                        required
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={termForm.isActive}
                            onChange={(e) =>
                                setTermForm({ ...termForm, isActive: e.target.checked })
                            }
                        />{' '}
                        نشط
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={closeTermModal}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={termSaving}>
                            {termSaving ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={holidayModal !== null}
                onClose={closeHolidayModal}
                title={holidayModal?.id ? 'تعديل إجازة' : 'إضافة إجازة'}
            >
                <form onSubmit={saveHoliday} className="space-y-3" noValidate>
                    <Input
                        label="الاسم"
                        value={holidayForm.name}
                        onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                        required
                    />
                    <Input
                        label="التاريخ"
                        type="date"
                        value={holidayForm.date}
                        onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                        required
                    />
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={holidayForm.isExceptional}
                            onChange={(e) =>
                                setHolidayForm({ ...holidayForm, isExceptional: e.target.checked })
                            }
                        />{' '}
                        استثنائية
                    </label>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="secondary" onClick={closeHolidayModal}>
                            إلغاء
                        </Button>
                        <Button type="submit" disabled={holidaySaving}>
                            {holidaySaving ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                title="تأكيد الحذف"
            >
                <p className="text-sm text-ink-700">حذف هذه الإجازة؟</p>
                <div className="mt-3 flex justify-end gap-2">
                    <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                        إلغاء
                    </Button>
                    <Button
                        variant="danger"
                        disabled={deletingHoliday}
                        onClick={() => removeHoliday(confirmDelete)}
                    >
                        حذف
                    </Button>
                </div>
            </Modal>

            {!settings && !error && tab === 'general' && (
                <p role="status" className="text-sm text-ink-600">
                    جاري التحميل...
                </p>
            )}
            {false && <Settings className="h-4 w-4" />}
        </div>
    );
}
