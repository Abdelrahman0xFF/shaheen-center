import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BranchesPage } from './BranchesPage';
import {
    createBranch,
    createRoom,
    listBranches,
    listRooms,
    updateBranch,
    updateRoom,
} from '../../api/admin';

vi.mock('../../api/admin', () => ({
    listBranches: vi.fn(),
    createBranch: vi.fn(),
    updateBranch: vi.fn(),
    listRooms: vi.fn(),
    createRoom: vi.fn(),
    updateRoom: vi.fn(),
}));

const authMock = vi.hoisted(() => ({ role: 'ADMIN' }));
vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({ user: { role: authMock.role } }),
}));

const branch = {
    id: 'b1',
    name: 'فرع أ',
    address: 'شارع النيل',
    phone: '01000000000',
    isActive: true,
    _count: { rooms: 1 },
};

const listResult = { data: [branch], meta: { page: 1, totalPages: 1, total: 1 } };

beforeEach(() => {
    authMock.role = 'ADMIN';
    listBranches.mockResolvedValue(listResult);
    listRooms.mockResolvedValue({ data: [], meta: { page: 1, totalPages: 1, total: 0 } });
    createBranch.mockResolvedValue({ data: branch });
    updateBranch.mockResolvedValue({ data: branch });
    createRoom.mockResolvedValue({ data: {} });
    updateRoom.mockResolvedValue({ data: {} });
});

describe('BranchesPage', () => {
    it('shows a loading state before the branch list resolves', () => {
        listBranches.mockImplementation(() => new Promise(() => {}));
        render(<BranchesPage />);

        expect(screen.getByRole('status')).toHaveTextContent('جاري التحميل...');
    });

    it('loads and renders branches with pagination metadata', async () => {
        render(<BranchesPage />);

        expect(await screen.findByText('فرع أ')).toBeInTheDocument();
        expect(screen.getByText('شارع النيل')).toBeInTheDocument();
        expect(listBranches).toHaveBeenCalledWith(
            expect.objectContaining({ page: 1, limit: 20, search: '' }),
        );
    });

    it('shows an empty state when there are no branches', async () => {
        listBranches.mockResolvedValue({ data: [], meta: { page: 1, totalPages: 1, total: 0 } });
        render(<BranchesPage />);

        expect(await screen.findByText('لا توجد فروع')).toBeInTheDocument();
    });

    it('shows the API error instead of silently failing', async () => {
        listBranches.mockRejectedValue({
            response: { data: { error: { message: 'تعذر جلب الفروع' } } },
        });
        render(<BranchesPage />);

        expect(await screen.findByRole('alert')).toHaveTextContent('تعذر جلب الفروع');
    });

    it('sends the active-status filter to the backend', async () => {
        render(<BranchesPage />);
        await screen.findByText('فرع أ');

        fireEvent.change(screen.getByLabelText('الحالة'), { target: { value: 'false' } });

        await waitFor(() =>
            expect(listBranches).toHaveBeenLastCalledWith(
                expect.objectContaining({ page: 1, isActive: 'false' }),
            ),
        );
    });

    it('validates required fields before creating a branch', async () => {
        render(<BranchesPage />);
        await screen.findByText('فرع أ');

        fireEvent.click(screen.getByRole('button', { name: /إضافة فرع/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));

        expect(within(dialog).getByRole('alert')).toHaveTextContent('اسم الفرع مطلوب');
        expect(createBranch).not.toHaveBeenCalled();
    });

    it('creates a branch and shows a success notice', async () => {
        render(<BranchesPage />);
        await screen.findByText('فرع أ');

        fireEvent.click(screen.getByRole('button', { name: /إضافة فرع/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), {
            target: { value: 'فرع جديد' },
        });
        fireEvent.change(within(dialog).getByLabelText('العنوان'), {
            target: { value: 'شارع جديد' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));

        await waitFor(() =>
            expect(createBranch).toHaveBeenCalledWith({
                name: 'فرع جديد',
                address: 'شارع جديد',
                phone: null,
                isActive: true,
            }),
        );
        expect(await screen.findByText('تم إنشاء الفرع')).toBeInTheDocument();
    });

    it('rejects an invalid room capacity', async () => {
        render(<BranchesPage />);
        await screen.findByText('فرع أ');

        fireEvent.click(screen.getByRole('button', { name: /قاعات/ }));
        const dialog = screen.getByRole('dialog');
        await within(dialog).findByText('لا توجد قاعات.');

        fireEvent.change(within(dialog).getByLabelText('اسم القاعة'), {
            target: { value: 'قاعة 1' },
        });
        fireEvent.change(within(dialog).getByLabelText('السعة'), { target: { value: '0' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة قاعة' }));

        expect(within(dialog).getByRole('alert')).toHaveTextContent('السعة غير صالحة');
        expect(createRoom).not.toHaveBeenCalled();
    });

    it('edits an existing room name and capacity', async () => {
        listRooms.mockResolvedValue({
            data: [{ id: 'r1', name: 'قاعة أ', capacity: 10, isActive: true }],
            meta: { page: 1, totalPages: 1, total: 1 },
        });
        render(<BranchesPage />);
        await screen.findByText('فرع أ');

        fireEvent.click(screen.getByRole('button', { name: /قاعات/ }));
        const dialog = screen.getByRole('dialog');
        await within(dialog).findByText('قاعة أ');

        fireEvent.click(within(dialog).getByRole('button', { name: 'تعديل' }));
        fireEvent.change(within(dialog).getByLabelText('السعة'), { target: { value: '12' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ التعديل' }));

        await waitFor(() =>
            expect(updateRoom).toHaveBeenCalledWith('r1', { name: 'قاعة أ', capacity: 12 }),
        );
    });

    it('hides branch create/edit actions from a branch manager', async () => {
        authMock.role = 'BRANCH_MANAGER';
        render(<BranchesPage />);
        await screen.findByText('فرع أ');

        expect(screen.queryByRole('button', { name: /إضافة فرع/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /تعديل/ })).not.toBeInTheDocument();
    });

    it('closes Create Branch on HTTP 400, shows error outside modal, no rejected record', async () => {
        createBranch.mockRejectedValue({
            response: { status: 400, data: { error: { message: 'اسم الفرع مطلوب' } } },
        });
        render(<BranchesPage />);
        await screen.findByText('فرع أ');
        fireEvent.click(screen.getByRole('button', { name: /إضافة فرع/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), {
            target: { value: 'فرع مرفوض' },
        });
        fireEvent.change(within(dialog).getByLabelText('العنوان'), { target: { value: 'عنوان' } });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.queryByText('فرع مرفوض')).not.toBeInTheDocument();
        expect(screen.queryByText('تم إنشاء الفرع')).not.toBeInTheDocument();
    });

    it('closes Edit Branch on HTTP 409, no success, no stale edited data', async () => {
        updateBranch.mockRejectedValue({
            response: { status: 409, data: { error: { message: 'يوجد فرع بنفس الاسم' } } },
        });
        render(<BranchesPage />);
        await screen.findByText('فرع أ');
        fireEvent.click(screen.getByRole('button', { name: /تعديل/ }));
        const dialog = screen.getByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('الاسم'), {
            target: { value: 'تعديل مرفوض' },
        });
        fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(screen.getByRole('alert')).toHaveTextContent('يوجد فرع بنفس الاسم');
        expect(screen.queryByText('تم تحديث الفرع')).not.toBeInTheDocument();
    });
});
