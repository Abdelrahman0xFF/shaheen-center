import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock the API modules before importing AuthContext
vi.mock('../api/auth.js', () => ({
    loginRequest: vi.fn(),
    logoutRequest: vi.fn(),
    logoutAllRequest: vi.fn(),
    meRequest: vi.fn(),
}));

vi.mock('../api/client.js', () => ({
    authSession: {
        getAccessToken: vi.fn(() => null),
        setAccessToken: vi.fn(),
        clear: vi.fn(),
        onExpired: vi.fn(),
        onSessionChanged: vi.fn(() => () => {}),
    },
    refreshAccessToken: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext.jsx';
import { loginRequest, logoutRequest, logoutAllRequest, meRequest } from '../api/auth.js';
import { authSession, refreshAccessToken } from '../api/client.js';

function renderWithAuth(ui) {
    return render(
        <MemoryRouter>
            <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>,
    );
}

function TestComponent() {
    const { user, loading, login, logout } = useAuth();
    return (
        <div>
            {loading ? <span data-testid="loading">جاري التحميل...</span> : null}
            {user ? (
                <div>
                    <span data-testid="user">{user.name}</span>
                    <button data-testid="logout" onClick={logout}>
                        خروج
                    </button>
                </div>
            ) : (
                <button
                    data-testid="login"
                    onClick={() => login({ identifier: 'x', password: 'y' })}
                >
                    دخول
                </button>
            )}
        </div>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('starts in loading state with no user', () => {
        renderWithAuth(<TestComponent />);
        expect(screen.getByTestId('loading')).toBeInTheDocument();
    });

    it('sets user after successful login', async () => {
        loginRequest.mockResolvedValue({
            accessToken: 'access-1',
            user: { id: 'u1', name: 'أحمد', role: 'ADMIN' },
        });

        renderWithAuth(<TestComponent />);

        await fireEvent.click(screen.getByTestId('login'));
        await vi.waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('أحمد'));

        expect(loginRequest).toHaveBeenCalledWith({ identifier: 'x', password: 'y' });
        expect(authSession.setAccessToken).toHaveBeenCalledWith('access-1');
    });

    it('clears session on logout', async () => {
        logoutRequest.mockResolvedValue({ revoked: true });

        renderWithAuth(<TestComponent />);

        // First login to have a user
        loginRequest.mockResolvedValue({
            accessToken: 'access-1',
            user: { id: 'u1', name: 'أحمد', role: 'ADMIN' },
        });
        await fireEvent.click(screen.getByTestId('login'));
        await vi.waitFor(() => expect(screen.getByTestId('user')).toBeInTheDocument());

        await fireEvent.click(screen.getByTestId('logout'));
        await vi.waitFor(() => expect(screen.queryByTestId('user')).not.toBeInTheDocument());

        expect(logoutRequest).toHaveBeenCalled();
        expect(authSession.clear).toHaveBeenCalled();
    });

    it('restores session via refresh on mount', async () => {
        refreshAccessToken.mockResolvedValue({
            accessToken: 'access-2',
            user: { id: 'u1', name: 'سارة', role: 'SECRETARY' },
        });

        renderWithAuth(<TestComponent />);

        await vi.waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('سارة'));
        expect(refreshAccessToken).toHaveBeenCalled();
    });

    it('clears session when refresh fails on mount', async () => {
        refreshAccessToken.mockRejectedValue(new Error('refresh failed'));

        renderWithAuth(<TestComponent />);

        await vi.waitFor(() => expect(screen.queryByTestId('user')).not.toBeInTheDocument());
        expect(authSession.clear).toHaveBeenCalled();
    });
});
