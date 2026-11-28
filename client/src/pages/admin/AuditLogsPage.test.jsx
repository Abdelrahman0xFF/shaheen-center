import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AuditLogsPage } from './AuditLogsPage';
import { listAuditLogs } from '../../api/admin';

vi.mock('../../api/admin', () => ({
    listAuditLogs: vi.fn(),
}));

const row = {
    id: 'a1',
    createdAt: '2026-11-27T10:00:00.000Z',
    user: { name: 'مدير النظام' },
    action: 'LOGIN_SUCCESS',
    entity: 'User',
    entityId: 'u1',
    ipAddress: '127.0.0.1',
    before: null,
    after: { role: 'ADMIN' },
};

beforeEach(() => {
    listAuditLogs.mockResolvedValue({
        data: [row],
        meta: { page: 1, totalPages: 1, total: 1 },
    });
});

describe('AuditLogsPage', () => {
    it('loads and renders audit entries', async () => {
        render(<AuditLogsPage />);

        expect(await screen.findByText('LOGIN_SUCCESS')).toBeInTheDocument();
        expect(screen.getByText('مدير النظام')).toBeInTheDocument();
        expect(screen.getByText('127.0.0.1')).toBeInTheDocument();
    });

    it('shows an empty state', async () => {
        listAuditLogs.mockResolvedValue({
            data: [],
            meta: { page: 1, totalPages: 1, total: 0 },
        });
        render(<AuditLogsPage />);

        expect(await screen.findByText('لا توجد سجلات')).toBeInTheDocument();
    });

    it('shows API failures', async () => {
        listAuditLogs.mockRejectedValue({
            response: { data: { error: { message: 'تعذر جلب سجل المراقبة' } } },
        });
        render(<AuditLogsPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent('تعذر جلب سجل المراقبة');
    });

    it('sends action and date filters to the backend', async () => {
        render(<AuditLogsPage />);
        await screen.findByText('LOGIN_SUCCESS');

        fireEvent.change(screen.getByLabelText('الإجراء'), {
            target: { value: 'LOGIN_SUCCESS' },
        });
        fireEvent.change(screen.getByLabelText('من تاريخ'), {
            target: { value: '2026-11-01' },
        });
        fireEvent.change(screen.getByLabelText('إلى تاريخ'), {
            target: { value: '2026-11-30' },
        });

        await waitFor(() =>
            expect(listAuditLogs).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    page: 1,
                    action: 'LOGIN_SUCCESS',
                    from: '2026-11-01',
                    to: '2026-11-30',
                }),
            ),
        );
    });

    it('paginates to the next page', async () => {
        listAuditLogs.mockResolvedValue({
            data: [row],
            meta: { page: 1, totalPages: 2, total: 21 },
        });
        render(<AuditLogsPage />);
        await screen.findByText('LOGIN_SUCCESS');

        fireEvent.click(screen.getByRole('button', { name: 'التالي' }));

        await waitFor(() =>
            expect(listAuditLogs).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })),
        );
    });

    it('opens a read-only details modal with before/after data', async () => {
        render(<AuditLogsPage />);
        await screen.findByText('LOGIN_SUCCESS');

        fireEvent.click(screen.getByRole('button', { name: 'عرض' }));
        const dialog = screen.getByRole('dialog');

        expect(within(dialog).getByText(/"role": "ADMIN"/)).toBeInTheDocument();
        expect(within(dialog).getByText('null')).toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: /تعديل|حذف/ })).not.toBeInTheDocument();
    });

    it('exposes no edit or delete actions on the list', async () => {
        render(<AuditLogsPage />);
        await screen.findByText('LOGIN_SUCCESS');

        expect(screen.queryByRole('button', { name: /تعديل|حذف/ })).not.toBeInTheDocument();
    });
});
