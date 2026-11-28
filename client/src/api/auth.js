import apiClient from './client';

export async function loginRequest({ identifier, password }) {
    const response = await apiClient.post(
        '/auth/login',
        { identifier, password },
        { skipAuth: true, _skipRefresh: true },
    );

    return response.data?.data;
}

export async function logoutRequest() {
    const response = await apiClient.post('/auth/logout', null, {
        skipAuth: true,
        _skipRefresh: true,
    });

    return response.data?.data;
}

export async function logoutAllRequest() {
    const response = await apiClient.post('/auth/logout-all');
    return response.data?.data;
}

export async function meRequest() {
    const response = await apiClient.get('/auth/me');
    return response.data?.data;
}
