import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { StaffPage } from './StaffPage';
import {
    createStaff,
    listBranches,
    listStaff,
    resetStaffPassword,
    toggleStaffStatus,
    updateStaff,
} from '../../api/admin';

vi.mock('../../api/admin', () => ({
    listStaff: vi.fn(),
    createStaff: vi.fn(),
    updateStaff: vi.fn(),
    toggleStaffStatus: vi.fn(),
    resetStaffPassword: vi.fn(),
    listBranches: vi.fn(),
}));

const member = {
    id: 'u1',
    name: 'سكرتير أ',
    phone: '01012345678',
    username: 'sec1@example.com',
    role: 'SECRETARY',
    isActive: true,
    branchIds: ['b1'],
    branches: [{ id: 'b1', name: 'فرع أ' }],
};

const branches = [{ id: 'b1', name: 'فرع أ' }];
const listResult = { data: [member], meta: { page: 1, totalPages: 1, total: 1 } };

beforeEach(() => {
    listStaff.mockResolvedValue(listResult);
    listBranches.mockResolvedValue({
        data: branches,
        meta: { page: 1, totalPages: 1, total: 1 },
    });
    createStaff.mockResolvedValue({ data: member });
    updateStaff.mockResolvedValue({ data: member });
    toggleStaffStatus.mockResolvedValue({ data: member });
    resetStaffPassword.mockResolvedValue({ data: { success: true } });
});

describe('StaffPage', () => {
    it('loads and renders staff records', async () => {
        render(<StaffPage />);

        expect(await screen.findByText('سكرتير أ')).toBeInTheDocument();
        expect(screen.getByText('01012345678')).toBeInTheDocument();
        expect(listStaff).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, limit: 20, search: '' }),
        );
    });

    it('shows an empty state', async () => {
        listStaff.mockResolvedValue({ data: [], meta: { page: 1, totalPages: 1, total: 0 } });
        render(<StaffPage />);

        expect(await screen.findByText('لا يوجد موظفون')).toBeInTheDocument();
    });

    it('shows API failures', async () => {
        listStaff.mockRejectedValue({
            response: { data: { error: { message: 'تعذر جلب الموظفين' } } },
        });
        render(<StaffPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent('تعذر جلب الموظفين');
    });

    it('combines role, status and branch filters using backend parameter names', async () => {
        render(<StaffPage />);
        await screen.findByText('سكرتير أ');

        fireEvent.change(screen.getByLabelText('الدور'), { target: { value: 'SECRETARY' } });
        fireEvent.change(screen.getByLabelText('الحالة'), { target: { value: 'false' } });
        fireEvent.change(screen.getByLabelText('الفرع'), { target: { value: 'b1' } });

        await waitFor(() =>
            expect(listStaff).toHaveBeenLastCalledWith(
                expect.objectContaining({
                    page: 1,
                    role: 'SECRETARY',
                    isActive: 'false',
                    branchId: 'b1',
                }),
            ),
        );
    });

    it('restores the unfiltered list when filters are cleared', async () => {
        render(<StaffPage />);
        await screen.findByText('سكرتير أ');

        fireEvent.change(screen.getByLabelText('الحالة'), { target: { value: 'false' } });
        await waitFor(() =>
            expect(listStaff).toHaveBeenLastCalledWith(
                expect.objectContaining({ isActive: 'false' }),
            ),
        );

        fireEvent.change(screen.getByLabelText('الحالة'), { target: { value: '' } });
        await waitFor(() => {
            const lastCall = listStaff.mock.calls.at(-1)[0];
            expect(lastCall.isActive).toBeUndefined();
            expect(lastCall.page).toBe(1);
        });
    });

    it('validates required staff fields before submitting', async () => {
        render(<StaffPage />);
        await screen.findByText('سكرتير أ');

        fireEvent.click(screen.getByRole('button', { name: /إضافة موظف/ }));
        const dialog = screen.getByRole('dialog');

        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent('الاسم مطلوب');

        fireEvent.change(within(dialog).getByLabelText('الاسم'), { target: { value: 'موظف' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent('رقم الموبايل مطلوب');

        fireEvent.change(within(dialog).getByLabelText('الهاتف'), {
            target: { value: '01012345678' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent('اختر فرعاً واحداً على الأقل');

        fireEvent.click(await within(dialog).findByLabelText('فرع أ'));
        fireEvent.change(within(dialog).getByLabelText('كلمة المرور'), {
            target: { value: 'short' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent(
            'كلمة المرور يجب أن تكون 12 حرفاً على الأقل',
        );
        expect(createStaff).not.toHaveBeenCalled();
    });

    it('creates a staff member with the selected branch', async () => {
        render(<StaffPage />);
        await screen.findByText('سكرتير أ');

        fireEvent.click(screen.getByRole('button', { name: /إضافة موظف/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), { target: { value: 'موظف' } });
        fireEvent.change(within(dialog).getByLabelText('الهاتف'), {
            target: { value: '01012345678' },
        });
        fireEvent.change(within(dialog).getByLabelText('كلمة المرور'), {
            target: { value: 'StrongPass12345' },
        });
        fireEvent.click(await within(dialog).findByLabelText('فرع أ'));
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));

        await waitFor(() =>
            expect(createStaff).toHaveBeenCalledWith({
                name: 'موظف',
                phone: '01012345678',
                username: null,
                role: 'SECRETARY',
                branchIds: ['b1'],
                password: 'StrongPass12345',
            }),
        );
        expect(await screen.findByText('تم إنشاء الموظف')).toBeInTheDocument();
    });

    it('rejects an invalid staff email and sends a normalized email in username', async () => {
        render(<StaffPage />);
        await screen.findByText('سكرتير أ');

        fireEvent.click(screen.getByRole('button', { name: /إضافة موظف/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), { target: { value: 'موظف' } });
        fireEvent.change(within(dialog).getByLabelText('الهاتف'), {
            target: { value: '01012345678' },
        });
        fireEvent.change(within(dialog).getByLabelText('كلمة المرور'), {
            target: { value: 'StrongPass12345' },
        });
        fireEvent.click(await within(dialog).findByLabelText('فرع أ'));

        // invalid email rejected client-side
        fireEvent.change(within(dialog).getByLabelText('البريد الإلكتروني / Email'), {
            target: { value: 'not-an-email' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent('البريد الإلكتروني غير صالح');
        expect(createStaff).not.toHaveBeenCalled();

        // valid email, normalized to lowercase, sent in existing `username` field
        fireEvent.change(within(dialog).getByLabelText('البريد الإلكتروني / Email'), {
            target: { value: '  Branch1@Example.com  ' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        await waitFor(() =>
            expect(createStaff).toHaveBeenCalledWith(
                expect.objectContaining({ username: 'branch1@example.com' }),
            ),
        );
    });

    it('requires confirmation before deactivating a staff member', async () => {
        render(<StaffPage />);
        await screen.findByText('سكرتير أ');

        fireEvent.click(screen.getByRole('button', { name: 'تعطيل' }));
        const dialog = screen.getByRole('dialog');
        expect(toggleStaffStatus).not.toHaveBeenCalled();

        fireEvent.click(within(dialog).getByRole('button', { name: 'تأكيد' }));

        await waitFor(() => expect(toggleStaffStatus).toHaveBeenCalledWith('u1', false));
        expect(await screen.findByText('تم تعطيل الموظف')).toBeInTheDocument();
    });

    it('validates and submits a password reset without exposing hashes', async () => {
        listStaff.mockResolvedValue({
            data: [{ ...member, passwordHash: 'super-secret-hash' }],
            meta: { page: 1, totalPages: 1, total: 1 },
        });
        render(<StaffPage />);
        await screen.findByText('سكرتير أ');
        expect(screen.queryByText('super-secret-hash')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /كلمة المرور/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'تأكيد' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent(
            'كلمة المرور يجب أن تكون 12 حرفاً على الأقل',
        );

        fireEvent.change(within(dialog).getByLabelText('كلمة المرور الجديدة'), {
            target: { value: 'AnotherStrong123' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'تأكيد' }));

        await waitFor(() =>
            expect(resetStaffPassword).toHaveBeenCalledWith('u1', 'AnotherStrong123'),
        );
        expect(await screen.findByText('تم إعادة تعيين كلمة المرور')).toBeInTheDocument();
    });

    it('closes Edit Staff on rejected backend update, no success, no stale edited data', async () => {
        updateStaff.mockRejectedValue({
            response: { status: 409, data: { error: { message: 'رقم الموبايل مستخدم بالفعل' } } },
        });
        render(<StaffPage />);
        await screen.findByText('سكرتير أ');
        fireEvent.click(screen.getByRole('button', { name: /تعديل/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), {
            target: { value: 'تعديل مرفوض' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('alert')).toHaveTextContent('رقم الموبايل مستخدم بالفعل');
        expect(screen.queryByText('تم تحديث الموظف')).not.toBeInTheDocument();
        expect(screen.queryByText('تعديل مرفوض')).not.toBeInTheDocument();
    });
});
