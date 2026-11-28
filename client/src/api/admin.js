import apiClient from './client';

// Branches & Rooms
export const listBranches = (params = {}) =>
    apiClient.get('/branches', { params }).then((r) => r.data);
export const createBranch = (body) => apiClient.post('/branches', body).then((r) => r.data);
export const updateBranch = (id, body) =>
    apiClient.patch(`/branches/${id}`, body).then((r) => r.data);
export const listRooms = (branchId, params = {}) =>
    apiClient.get(`/branches/${branchId}/rooms`, { params }).then((r) => r.data);
export const createRoom = (branchId, body) =>
    apiClient.post(`/branches/${branchId}/rooms`, body).then((r) => r.data);
export const updateRoom = (roomId, body) =>
    apiClient.patch(`/branches/rooms/${roomId}`, body).then((r) => r.data);

// Staff
export const listStaff = (params = {}) => apiClient.get('/staff', { params }).then((r) => r.data);
export const createStaff = (body) => apiClient.post('/staff', body).then((r) => r.data);
export const updateStaff = (id, body) => apiClient.patch(`/staff/${id}`, body).then((r) => r.data);
export const toggleStaffStatus = (id, isActive) =>
    apiClient.patch(`/staff/${id}/status`, { isActive }).then((r) => r.data);
export const resetStaffPassword = (id, newPassword) =>
    apiClient.post(`/staff/${id}/reset-password`, { newPassword }).then((r) => r.data);

// Settings / Calendar
export const getSettings = () => apiClient.get('/settings').then((r) => r.data);
export const updateSettings = (body) => apiClient.patch('/settings', body).then((r) => r.data);
export const listTerms = (params = {}) =>
    apiClient.get('/settings/terms', { params }).then((r) => r.data);
export const createTerm = (body) => apiClient.post('/settings/terms', body).then((r) => r.data);
export const updateTerm = (id, body) =>
    apiClient.patch(`/settings/terms/${id}`, body).then((r) => r.data);
export const listHolidays = (params = {}) =>
    apiClient.get('/settings/holidays', { params }).then((r) => r.data);
export const createHoliday = (body) =>
    apiClient.post('/settings/holidays', body).then((r) => r.data);
export const updateHoliday = (id, body) =>
    apiClient.patch(`/settings/holidays/${id}`, body).then((r) => r.data);
export const deleteHoliday = (id) =>
    apiClient.delete(`/settings/holidays/${id}`).then((r) => r.data);

// Audit logs
export const listAuditLogs = (params = {}) =>
    apiClient.get('/settings/audit-logs', { params }).then((r) => r.data);
