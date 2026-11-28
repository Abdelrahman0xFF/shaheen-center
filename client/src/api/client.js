import axios from 'axios';

let accessToken = null;
let refreshPromise = null;
let onSessionExpired = null;
const sessionListeners = new Set();

export const authSession = {
    getAccessToken: () => accessToken,
    setAccessToken: (token) => {
        accessToken = token || null;
    },
    clear: () => {
        accessToken = null;
    },
    onExpired: (handler) => {
        onSessionExpired = typeof handler === 'function' ? handler : null;
    },
    /** Subscribe to session changes; returns an unsubscribe function. */
    onSessionChanged: (handler) => {
        if (typeof handler !== 'function') return () => {};
        sessionListeners.add(handler);
        return () => sessionListeners.delete(handler);
    },
};

function emitSession(payload) {
    for (const handler of [...sessionListeners]) {
        try {
            handler(payload);
        } catch {
            // listener errors must not break auth flow
        }
    }
}

function isRefreshRace(error) {
    return error?.response?.data?.error?.code === 'REFRESH_RACE';
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function performRefresh() {
    // Send a valid empty JSON object. Axios would otherwise serialize `null`
    // to the literal body `null` (Content-Length: 4); strict `express.json()`
    // rejects top-level primitives with 400 INVALID_JSON. The refresh token
    // travels only in the HttpOnly cookie.
    const response = await apiClient.post(
        '/auth/refresh',
        {},
        {
            skipAuth: true,
            _skipRefresh: true,
        },
    );

    const data = response.data?.data;
    const token = data?.accessToken;

    if (!token) {
        throw new Error('No access token returned by refresh endpoint');
    }

    accessToken = token;
    const user = data?.user || null;
    emitSession({ accessToken: token, user });
    return { accessToken: token, user };
}

export async function refreshAccessToken() {
    if (!refreshPromise) {
        refreshPromise = (async () => {
            try {
                return await performRefresh();
            } catch (error) {
                if (isRefreshRace(error)) {
                    // One short jittered retry for a concurrent rotation.
                    await delay(50 + Math.random() * 100);
                    return performRefresh();
                }
                accessToken = null;
                emitSession({ user: null, expired: true });
                throw error;
            }
        })().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
}

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 15000,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    if (accessToken && !config.skipAuth) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error?.config;

        if (
            error?.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest._skipRefresh &&
            !String(originalRequest.url || '').includes('/auth/login') &&
            !String(originalRequest.url || '').includes('/auth/refresh')
        ) {
            originalRequest._retry = true;

            try {
                const result = await refreshAccessToken();
                if (result.accessToken) {
                    accessToken = result.accessToken;
                }
                return apiClient(originalRequest);
            } catch (refreshError) {
                accessToken = null;
                if (onSessionExpired) onSessionExpired();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);

export default apiClient;
