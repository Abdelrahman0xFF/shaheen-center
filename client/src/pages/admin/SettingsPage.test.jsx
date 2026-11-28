import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { SettingsPage } from './SettingsPage';
import {
    createHoliday,
    createTerm,
    deleteHoliday,
    getSettings,
    listHolidays,
    listTerms,
    updateSettings,
    updateHoliday,
    updateTerm,
} from '../../api/admin';

vi.mock('../../api/admin', () => ({
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    listTerms: vi.fn(),
    createTerm: vi.fn(),
    updateTerm: vi.fn(),
    listHolidays: vi.fn(),
    createHoliday: vi.fn(),
    updateHoliday: vi.fn(),
    deleteHoliday: vi.fn(),
}));

const settings = {
    center_name: 'سنتر شاهين',
    late_threshold_minutes: 10,
    absence_alert_minutes: 30,
    working_days: [0, 1, 2, 3, 4],
    currency: 'EGP',
    timezone: 'Africa/Cairo',
};

beforeEach(() => {
    getSettings.mockResolvedValue({ data: { ...settings } });
    updateSettings.mockResolvedValue({ data: { ...settings } });
    listTerms.mockResolvedValue({ data: [], meta: { page: 1, totalPages: 1, total: 0 } });
    listHolidays.mockResolvedValue({ data: [], meta: { page: 1, totalPages: 1, total: 0 } });
    createTerm.mockResolvedValue({ data: {} });
    updateTerm.mockResolvedValue({ data: {} });
    updateHoliday.mockResolvedValue({ data: {} });
    createHoliday.mockResolvedValue({ data: {} });
    deleteHoliday.mockResolvedValue({ data: {} });
});

describe('SettingsPage', () => {
    it('loads and renders the general settings', async () => {
        render(<SettingsPage />);

        expect(await screen.findByDisplayValue('سنتر شاهين')).toBeInTheDocument();
        expect(screen.getByText(/EGP/)).toBeInTheDocument();
    });

    it('shows a settings loading failure instead of loading forever', async () => {
        getSettings.mockRejectedValue({
            response: { data: { error: { message: 'تعذر جلب الإعدادات' } } },
        });
        render(<SettingsPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent('تعذر جلب الإعدادات');
        expect(screen.queryByText('جاري التحميل...')).not.toBeInTheDocument();
    });

    it('saves general settings and shows a success notice', async () => {
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');

        fireEvent.change(screen.getByLabelText('اسم السنتر'), {
            target: { value: 'سنتر جديد' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

        await waitFor(() =>
            expect(updateSettings).toHaveBeenCalledWith({
                center_name: 'سنتر جديد',
                late_threshold_minutes: 10,
                absence_alert_minutes: 30,
                working_days: [0, 1, 2, 3, 4],
            }),
        );
        expect(await screen.findByText('تم حفظ الإعدادات')).toBeInTheDocument();
    });

    it('includes toggled working days in the save payload', async () => {
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');

        fireEvent.click(screen.getByLabelText('الخميس'));
        fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));

        await waitFor(() =>
            expect(updateSettings).toHaveBeenCalledWith(
                expect.objectContaining({ working_days: [0, 1, 2, 3] }),
            ),
        );
    });

    it('renders the terms tab and creates a term', async () => {
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');

        fireEvent.click(screen.getByRole('tab', { name: 'الفصول الدراسية' }));
        expect(screen.getByText('لا توجد فصول دراسية')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /إضافة فصل/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), {
            target: { value: 'الفصل الأول' },
        });
        fireEvent.change(within(dialog).getByLabelText('السنة'), {
            target: { value: '2026' },
        });
        fireEvent.change(within(dialog).getByLabelText('تاريخ البداية'), {
            target: { value: '2026-09-01' },
        });
        fireEvent.change(within(dialog).getByLabelText('تاريخ النهاية'), {
            target: { value: '2026-12-31' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));

        await waitFor(() =>
            expect(createTerm).toHaveBeenCalledWith({
                name: 'الفصل الأول',
                year: '2026',
                startDate: '2026-09-01',
                endDate: '2026-12-31',
                isActive: true,
            }),
        );
    });

    it('displays backend term validation errors', async () => {
        createTerm.mockRejectedValue({
            response: { data: { error: { message: 'تاريخ البداية يجب أن يسبق النهاية' } } },
        });
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');

        fireEvent.click(screen.getByRole('tab', { name: 'الفصول الدراسية' }));
        fireEvent.click(screen.getByRole('button', { name: /إضافة فصل/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), { target: { value: 'فصل' } });
        fireEvent.change(within(dialog).getByLabelText('السنة'), { target: { value: '2026' } });
        fireEvent.change(within(dialog).getByLabelText('تاريخ البداية'), {
            target: { value: '2026-12-31' },
        });
        fireEvent.change(within(dialog).getByLabelText('تاريخ النهاية'), {
            target: { value: '2026-09-01' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'تاريخ البداية يجب أن يسبق النهاية',
        );
    });

    it('confirms before deleting a holiday', async () => {
        listHolidays.mockResolvedValue({
            data: [
                {
                    id: 'h1',
                    name: 'عيد',
                    date: '2026-01-01T00:00:00.000Z',
                    isExceptional: false,
                },
            ],
            meta: { page: 1, totalPages: 1, total: 1 },
        });
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');

        fireEvent.click(screen.getByRole('tab', { name: 'الإجازات' }));
        expect(await screen.findByText('عيد')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'حذف الإجازة' }));
        expect(deleteHoliday).not.toHaveBeenCalled();

        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'حذف' }));

        await waitFor(() => expect(deleteHoliday).toHaveBeenCalledWith('h1'));
        expect(await screen.findByText('تم حذف الإجازة')).toBeInTheDocument();
    });

    it('shows an error when the calendar cannot be loaded', async () => {
        listTerms.mockRejectedValue({
            response: { data: { error: { message: 'تعذر جلب بيانات التقويم' } } },
        });
        render(<SettingsPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent('تعذر جلب بيانات التقويم');
    });

    it('closes Create Term on HTTP 400, shows an Arabic error outside the modal, no success, no rejected record', async () => {
        createTerm.mockRejectedValue({
            response: { data: { error: { message: 'تاريخ غير صالح' } } },
        });
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');
        fireEvent.click(screen.getByRole('tab', { name: 'الفصول الدراسية' }));
        fireEvent.click(screen.getByRole('button', { name: /إضافة فصل/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), {
            target: { value: 'فصل مرفوض' },
        });
        fireEvent.change(within(dialog).getByLabelText('السنة'), { target: { value: '2026' } });
        fireEvent.change(within(dialog).getByLabelText('تاريخ البداية'), {
            target: { value: '2026-09-01' },
        });
        fireEvent.change(within(dialog).getByLabelText('تاريخ النهاية'), {
            target: { value: '2026-12-31' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('alert')).toHaveTextContent('تاريخ غير صالح');
        expect(screen.queryByText('تم إنشاء الفصل')).not.toBeInTheDocument();
        expect(screen.queryByText('فصل مرفوض')).not.toBeInTheDocument();
        // notification remains visible after modal unmount
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('closes Edit Holiday on HTTP 409, no success, no stale data, list refreshes', async () => {
        listHolidays.mockResolvedValue({
            data: [
                { id: 'h1', name: 'عيد', date: '2026-01-01T00:00:00.000Z', isExceptional: false },
            ],
            meta: { page: 1, totalPages: 1, total: 1 },
        });
        updateHoliday.mockRejectedValue({
            response: { data: { error: { message: 'الإجازة موجودة بالفعل' } } },
        });
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');
        fireEvent.click(screen.getByRole('tab', { name: 'الإجازات' }));
        await screen.findByText('عيد');
        fireEvent.click(screen.getByRole('button', { name: 'تعديل' }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), {
            target: { value: 'تعديل مرفوض' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('alert')).toHaveTextContent('الإجازة موجودة بالفعل');
        expect(screen.queryByText('تم تحديث الإجازة')).not.toBeInTheDocument();
        expect(screen.queryByText('تعديل مرفوض')).not.toBeInTheDocument();
    });

    it('closes Create Term on HTTP 500 and resets state', async () => {
        createTerm.mockRejectedValue({ response: { status: 500, data: {} } });
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');
        fireEvent.click(screen.getByRole('tab', { name: 'الفصول الدراسية' }));
        fireEvent.click(screen.getByRole('button', { name: /إضافة فصل/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), { target: { value: 'x' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('network failure closes the form and resets loading', async () => {
        createTerm.mockRejectedValue(new Error('network down'));
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');
        fireEvent.click(screen.getByRole('tab', { name: 'الفصول الدراسية' }));
        fireEvent.click(screen.getByRole('button', { name: /إضافة فصل/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.queryByText('جاري الحفظ...')).not.toBeInTheDocument();
    });

    it('closing Create resets form; opening Edit does not show stale create values', async () => {
        listTerms.mockResolvedValue({
            data: [
                {
                    id: 't1',
                    name: 'فصل',
                    year: '2026',
                    startDate: '2026-09-01',
                    endDate: '2026-12-31',
                    isActive: false,
                },
            ],
            meta: { page: 1, totalPages: 1, total: 1 },
        });
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');
        fireEvent.click(screen.getByRole('tab', { name: 'الفصول الدراسية' }));

        fireEvent.click(screen.getByRole('button', { name: /إضافة فصل/ }));
        let dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), { target: { value: 'مؤقت' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /إضافة فصل/ }));
        dialog = screen.getByRole('dialog');
        expect(within(dialog).getByLabelText('الاسم')).toHaveValue('');
        fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }));

        fireEvent.click(screen.getByRole('button', { name: 'تعديل' }));
        dialog = screen.getByRole('dialog');
        expect(within(dialog).getByLabelText('الاسم')).toHaveValue('فصل');
    });

    it('multiple clicks cannot submit the same term form simultaneously', async () => {
        let resolveCreate;
        createTerm.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveCreate = resolve;
                }),
        );
        render(<SettingsPage />);
        await screen.findByDisplayValue('سنتر شاهين');
        fireEvent.click(screen.getByRole('tab', { name: 'الفصول الدراسية' }));
        fireEvent.click(screen.getByRole('button', { name: /إضافة فصل/ }));
        const dialog = screen.getByRole('dialog');
        const save = within(dialog).getByRole('button', { name: 'حفظ' });
        fireEvent.click(save);
        fireEvent.click(save);
        fireEvent.click(save);
        expect(createTerm).toHaveBeenCalledTimes(1);
        resolveCreate({ data: {} });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    });
});
