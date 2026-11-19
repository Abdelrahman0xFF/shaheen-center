export function sendSuccess(
    res,
    { data = null, message = 'تم بنجاح', meta = undefined, statusCode = 200 } = {},
) {
    const payload = { success: true, message, data };
    if (meta) payload.meta = meta;
    return res.status(statusCode).json(payload);
}

export function buildPaginationMeta(page, limit, total) {
    const safeLimit = Math.max(1, Number(limit) || 20);
    const safePage = Math.max(1, Number(page) || 1);
    return {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
    };
}

export function parsePagination(query = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
