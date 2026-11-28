import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RoleProtectedRoute } from './ProtectedRoute.jsx';
import { useAuth } from '../context/AuthContext.jsx';

vi.mock('../context/AuthContext.jsx', () => ({
    useAuth: vi.fn(),
    AuthProvider: ({ children }) => children,
}));

function TestRoute() {
    return <div data-testid="inner">محمي</div>;
}

function renderProtected(ui, { allowedRoles } = {}) {
    return render(
        <MemoryRouter>
            <Routes>
                <Route
                    path="/"
                    element={<ProtectedRoute allowedRoles={allowedRoles}>{ui}</ProtectedRoute>}
                />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ProtectedRoute', () => {
    it('shows loading while session restores', () => {
        vi.mocked(useAuth).mockReturnValue({ user: null, loading: true });
        renderProtected(<TestRoute />);
        expect(screen.getByText(/جاري التحميل/)).toBeInTheDocument();
    });

    it('redirects to login when not authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({ user: null, loading: false });
        renderProtected(<TestRoute />);
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
    });

    it('renders children when authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { id: 'u1', name: 'أحمد', role: 'ADMIN' },
            loading: false,
        });
        renderProtected(<TestRoute />);
        expect(screen.getByTestId('inner')).toBeInTheDocument();
    });

    it('denies access when role not allowed', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { id: 'u1', name: 'أحمد', role: 'SECRETARY' },
            loading: false,
        });
        renderProtected(<TestRoute />, { allowedRoles: ['ADMIN'] });
        expect(screen.queryByTestId('inner')).not.toBeInTheDocument();
    });
});

describe('RoleProtectedRoute', () => {
    it('renders children when role is allowed', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { id: 'u1', name: 'أحمد', role: 'ADMIN' },
            loading: false,
        });
        const { container } = render(
            <MemoryRouter>
                <Routes>
                    <Route
                        path="/"
                        element={
                            <RoleProtectedRoute allowedRoles={['ADMIN']}>
                                <TestRoute />
                            </RoleProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        );
        expect(container.querySelector('[data-testid="inner"]')).toBeInTheDocument();
    });
});
