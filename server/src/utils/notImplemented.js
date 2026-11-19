import { ApiError } from '../middlewares/errorHandler.js';

export function notImplemented(owner, endpointLabel) {
    return (_req, _res, next) => {
        next(
            new ApiError(
                501,
                `Endpoint not implemented yet: ${endpointLabel} (Owner: ${owner})`,
                'NOT_IMPLEMENTED',
            ),
        );
    };
}
