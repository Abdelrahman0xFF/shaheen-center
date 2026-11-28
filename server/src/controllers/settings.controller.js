import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getClientIp } from '../utils/requestContext.js';
import * as settingsService from '../services/settings.service.js';

// Member 1 (Ezzat) — FR-CAL-01, FR-ADM-07, FR-RPT-02, FR-RPT-03
export const getSettings = asyncHandler(async (req, res) => {
    const settings = await settingsService.getSettings();
    return sendSuccess(res, { data: settings, message: 'تم جلب الإعدادات' });
});

export const updateSettings = asyncHandler(async (req, res) => {
    const settings = await settingsService.updateSettings(req.user, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: settings, message: 'تم تحديث الإعدادات' });
});

export const listTerms = asyncHandler(async (req, res) => {
    const { items, meta } = await settingsService.listTerms(req.query);
    return sendSuccess(res, { data: items, meta, message: 'تم جلب الفصول الدراسية' });
});

export const createTerm = asyncHandler(async (req, res) => {
    const term = await settingsService.createTerm(req.user, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: term, message: 'تم إنشاء الفصل الدراسي', statusCode: 201 });
});

export const updateTerm = asyncHandler(async (req, res) => {
    const term = await settingsService.updateTerm(req.user, req.params.id, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: term, message: 'تم تحديث الفصل الدراسي' });
});

export const listHolidays = asyncHandler(async (req, res) => {
    const { items, meta } = await settingsService.listHolidays(req.query);
    return sendSuccess(res, { data: items, meta, message: 'تم جلب الإجازات' });
});

export const createHoliday = asyncHandler(async (req, res) => {
    const holiday = await settingsService.createHoliday(req.user, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: holiday, message: 'تم إنشاء الإجازة', statusCode: 201 });
});

export const updateHoliday = asyncHandler(async (req, res) => {
    const holiday = await settingsService.updateHoliday(req.user, req.params.id, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: holiday, message: 'تم تحديث الإجازة' });
});

export const deleteHoliday = asyncHandler(async (req, res) => {
    const result = await settingsService.deleteHoliday(req.user, req.params.id, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: result, message: 'تم حذف الإجازة' });
});

export const listAuditLogs = asyncHandler(async (req, res) => {
    const { items, meta } = await settingsService.listAuditLogs(req.query);
    return sendSuccess(res, { data: items, meta, message: 'تم جلب سجل المراقبة' });
});
