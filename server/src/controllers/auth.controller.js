import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { notImplemented } from '../utils/notImplemented.js';
import * as authService from '../services/auth.service.js';

// Member 1 (Ezzat) — Implement Auth handlers
export const login = notImplemented('Member 1 (Ezzat)', 'POST /api/auth/login');
export const refresh = notImplemented('Member 1 (Ezzat)', 'POST /api/auth/refresh');
export const logout = notImplemented('Member 1 (Ezzat)', 'POST /api/auth/logout');

export const me = asyncHandler(async (req, res) => {
    const profile = await authService.getCurrentUser(req.user.id);
    return sendSuccess(res, { data: profile });
});
