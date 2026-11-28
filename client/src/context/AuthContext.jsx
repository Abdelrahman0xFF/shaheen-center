import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authSession, refreshAccessToken } from '../api/client';
import { loginRequest, logoutRequest, logoutAllRequest, meRequest } from '../api/auth';

const AuthContext = createContext(null);

/**
 * Member 1 (Ezzat) — Authentication context.
 *
 * Access tokens live only in memory. Sessions are restored by calling the
 * refresh endpoint on application startup (the refresh token itself is an
 * HttpOnly cookie and is never readable from JavaScript). User state stays in
 * sync with the Axios interceptor via authSession.onSessionChanged (A6).
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sessionExpired, setSessionExpired] = useState(false);

    useEffect(() => {
        let cancelled = false;

        authSession.onExpired(() => {
            if (!cancelled) {
                setUser(null);
                setSessionExpired(true);
            }
        });

        const unsubscribe = authSession.onSessionChanged(async (payload) => {
            if (cancelled) return;
            if (payload?.expired) {
                authSession.clear();
                setUser(null);
                setSessionExpired(true);
                return;
            }
            if (payload?.user) {
                setUser(payload.user);
                setSessionExpired(false);
                return;
            }
            // No user in payload; fall back to /auth/me.
            try {
                const profile = await meRequest();
                if (!cancelled) setUser(profile || null);
            } catch {
                if (!cancelled) setUser(null);
            }
        });

        async function restoreSession() {
            try {
                const refreshResult = await refreshAccessToken();
                authSession.setAccessToken(refreshResult.accessToken);

                let profile = refreshResult.user;
                if (!profile) {
                    profile = await meRequest();
                }

                if (!cancelled) {
                    setUser(profile || null);
                    setSessionExpired(false);
                }
            } catch {
                authSession.clear();
                if (!cancelled) setUser(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        restoreSession();

        return () => {
            cancelled = true;
            authSession.onExpired(null);
            unsubscribe();
        };
    }, []);

    const login = useCallback(async (credentials) => {
        const data = await loginRequest(credentials);
        authSession.setAccessToken(data?.accessToken || null);
        setUser(data?.user || null);
        setSessionExpired(false);
        return data?.user || null;
    }, []);

    const logout = useCallback(async () => {
        try {
            await logoutRequest();
        } catch {
            // Network errors must not prevent local session cleanup.
        } finally {
            authSession.clear();
            setUser(null);
            setSessionExpired(false);
        }
    }, []);

    const logoutAll = useCallback(async () => {
        try {
            await logoutAllRequest();
        } catch {
            // Network errors must not prevent local session cleanup.
        } finally {
            authSession.clear();
            setUser(null);
            setSessionExpired(false);
        }
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                sessionExpired,
                login,
                logout,
                logoutAll,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
