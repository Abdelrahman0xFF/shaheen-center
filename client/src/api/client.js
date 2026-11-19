import axios from 'axios';

const ACCESS_TOKEN_KEY = 'shaheen_access_token';
const REFRESH_TOKEN_KEY = 'shaheen_refresh_token';

export const tokenStorage = {
    getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
    getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
    setTokens: (accessToken, refreshToken) => {
        if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },
    clear: () => {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
};

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use((config) => {
    const token = tokenStorage.getAccess();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Member 1 (Ezzat) TODO: Enhance 401 interceptor to refresh access token via POST /auth/refresh
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Placeholder: clear invalid token if not on login endpoint
            if (!error.config?.url?.includes('/auth/login')) {
                tokenStorage.clear();
            }
        }
        return Promise.reject(error);
    },
);

export default apiClient;
