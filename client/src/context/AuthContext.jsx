import { createContext, useContext, useEffect, useState } from 'react';
import apiClient, { tokenStorage } from '../api/client';

const AuthContext = createContext(null);

/**
 * Member 1 (Ezzat) owns AuthContext integration with /api/auth/login, /refresh, /me, /logout.
 * During early UI development before Auth API is complete, `devBypassUser` lets teammates
 * preview layouts by switching roles cleanly if desired.
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = tokenStorage.getAccess();
        if (!token) {
            setLoading(false);
            return;
        }

        apiClient
            .get('/auth/me')
            .then((res) => setUser(res.data?.data || null))
            .catch(() => {
                tokenStorage.clear();
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    async function login(credentials) {
        const res = await apiClient.post('/auth/login', credentials);
        const { accessToken, refreshToken, user: loggedInUser } = res.data.data;
        tokenStorage.setTokens(accessToken, refreshToken);
        setUser(loggedInUser);
        return loggedInUser;
    }

    async function logout() {
        try {
            await apiClient.post('/auth/logout');
        } catch {
            // Ignore network errors on logout
        } finally {
            tokenStorage.clear();
            setUser(null);
        }
    }

    return (
        <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
