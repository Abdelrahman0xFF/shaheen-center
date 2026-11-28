import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { listAuditLogs } from '../../api/admin';
import { Button, Card, EmptyState, Input, Modal, PageHeader, Table } from '../../components/ui';
import { formatDateCairo, formatTimeCairo } from '../../utils/formatters';

export function AuditLogsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
    const [filters, setFilters] = useState({
        action: '',
        entity: '',
        userId: '',
        from: '',
        to: '',
        search: '',
    });
    const [openRow, setOpenRow] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: 20 };
            for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
            const res = await listAuditLogs(params);
            setItems(res.data || []);
            setMeta(res.meta || { page: 1, totalPages: 1, total: 0 });
        } catch (err) {
            setError(err?.response?.data?.error?.message || 'تعذر جلب سجل المراقبة');
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <div className="space-y-4">
            <PageHeader
                title="سجل المراقبة"
                subtitle="سجل غير قابل للتعديل للعمليات الحساسة (Admin)"
            />

            <Card padding="p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Input
                        label="بحث"
                        value={filters.search}
                        onChange={(e) => {
                            setFilters({ ...filters, search: e.target.value });
                            setPage(1);
                        }}
                    />
                    <Input
                        label="الإجراء"
                        value={filters.action}
                        onChange={(e) => {
                            setFilters({ ...filters, action: e.target.value });
                            setPage(1);
                        }}
                        dir="ltr"
                    />
                    <Input
                        label="الكيان"
                        value={filters.entity}
                        onChange={(e) => {
                            setFilters({ ...filters, entity: e.target.value });
                            setPage(1);
                        }}
                        dir="ltr"
                    />
                    <Input
                        label="معرف المستخدم"
                        value={filters.userId}
                        onChange={(e) => {
                            setFilters({ ...filters, userId: e.target.value });
                            setPage(1);
                        }}
                        dir="ltr"
                    />
                    <Input
                        label="من تاريخ"
                        type="date"
                        value={filters.from}
                        onChange={(e) => {
                            setFilters({ ...filters, from: e.target.value });
                            setPage(1);
                        }}
                    />
                    <Input
                        label="إلى تاريخ"
                        type="date"
                        value={filters.to}
                        onChange={(e) => {
                            setFilters({ ...filters, to: e.target.value });
                            setPage(1);
                        }}
                    />
                </div>
            </Card>

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
                <EmptyState icon={ShieldCheck} title="لا توجد سجلات" />
            ) : (
                <Card padding="p-0">
                    <Table>
                        <thead>
                            <tr>
                                <th>الوقت (القاهرة)</th>
                                <th>المستخدم</th>
                                <th>الإجراء</th>
                                <th>الكيان</th>
                                <th>المعرف</th>
                                <th>IP</th>
                                <th>تفاصيل</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row) => (
                                <tr key={row.id}>
                                    <td>
                                        {formatDateCairo(row.createdAt)}{' '}
                                        {formatTimeCairo(row.createdAt)}
                                    </td>
                                    <td>{row.user?.name || '—'}</td>
                                    <td dir="ltr">{row.action}</td>
                                    <td dir="ltr">{row.entity}</td>
                                    <td dir="ltr" className="text-xs">
                                        {row.entityId || '—'}
                                    </td>
                                    <td dir="ltr" className="text-xs">
                                        {row.ipAddress || '—'}
                                    </td>
                                    <td>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => setOpenRow(row)}
                                        >
                                            عرض
                                        </Button>
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

            <Modal open={openRow !== null} onClose={() => setOpenRow(null)} title="تفاصيل السجل">
                {openRow && (
                    <div className="space-y-3 text-sm">
                        <div>
                            <strong>الإجراء:</strong> <span dir="ltr">{openRow.action}</span>
                        </div>
                        <div>
                            <strong>قبل:</strong>
                            <pre
                                className="mt-1 max-h-60 overflow-auto rounded-lg bg-surface-muted p-2 text-xs"
                                dir="ltr"
                            >
                                {JSON.stringify(openRow.before ?? null, null, 2)}
                            </pre>
                        </div>
                        <div>
                            <strong>بعد:</strong>
                            <pre
                                className="mt-1 max-h-60 overflow-auto rounded-lg bg-surface-muted p-2 text-xs"
                                dir="ltr"
                            >
                                {JSON.stringify(openRow.after ?? null, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
