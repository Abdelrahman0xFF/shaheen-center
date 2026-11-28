import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';
import { getClientIp } from '../utils/requestContext.js';
import * as branchesService from '../services/branches.service.js';

// Member 1 (Ezzat) — FR-ORG-01, FR-ORG-02
export const listBranches = asyncHandler(async (req, res) => {
    const { items, meta } = await branchesService.listBranches(
        req.user,
        req.query,
        req.branchScope,
    );
    return sendSuccess(res, { data: items, meta, message: 'تم جلب الفروع' });
});

export const getBranch = asyncHandler(async (req, res) => {
    const branch = await branchesService.getBranch(req.user, req.params.id);
    return sendSuccess(res, { data: branch, message: 'تم جلب الفرع' });
});

export const createBranch = asyncHandler(async (req, res) => {
    const branch = await branchesService.createBranch(req.user, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: branch, message: 'تم إنشاء الفرع', statusCode: 201 });
});

export const updateBranch = asyncHandler(async (req, res) => {
    const branch = await branchesService.updateBranch(req.user, req.params.id, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: branch, message: 'تم تحديث الفرع' });
});

export const listRooms = asyncHandler(async (req, res) => {
    const { items, meta } = await branchesService.listRooms(
        req.user,
        req.params.branchId,
        req.query,
    );
    return sendSuccess(res, { data: items, meta, message: 'تم جلب القاعات' });
});

export const createRoom = asyncHandler(async (req, res) => {
    const room = await branchesService.createRoom(req.user, req.params.branchId, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: room, message: 'تم إنشاء القاعة', statusCode: 201 });
});

export const updateRoom = asyncHandler(async (req, res) => {
    const room = await branchesService.updateRoom(req.user, req.params.roomId, req.body, {
        ipAddress: getClientIp(req),
    });
    return sendSuccess(res, { data: room, message: 'تم تحديث القاعة' });
});
