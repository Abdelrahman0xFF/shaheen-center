import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getClientIp } from '../utils/requestContext.js';
import * as staffService from '../services/staff.service.js';

// Member 1 (Ezzat) — FR-AUTH-05
export const listStaff = asyncHandler(async (req, res) => {
    const { items, meta } = await staffService.listStaff(req.query);
    return sendSuccess(res, { data: items, meta, message: 'تم جلب الموظفين' });
});

export const createStaff = asyncHandler(async (req, res) => {
    const staff = await staffService.createStaff(req.user, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: staff, message: 'تم إنشاء الموظف', statusCode: 201 });
});

export const updateStaff = asyncHandler(async (req, res) => {
    const staff = await staffService.updateStaff(req.user, req.params.id, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: staff, message: 'تم تحديث الموظف' });
});

export const toggleStaffStatus = asyncHandler(async (req, res) => {
    const staff = await staffService.toggleStaffStatus(req.user, req.params.id, req.body.isActive, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: staff, message: 'تم تحديث حالة الموظف' });
});

export const resetStaffPassword = asyncHandler(async (req, res) => {
    const result = await staffService.resetStaffPassword(
        req.user,
        req.params.id,
        req.body.newPassword,
        { ipAddress: getClientIp(req) },
    );
    return sendSuccess(res, { data: result, message: 'تم إعادة تعيين كلمة المرور' });
});
