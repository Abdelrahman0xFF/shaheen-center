import crypto from 'crypto';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Assigns a request id. An inbound X-Request-Id is honoured only when it
 * matches a safe token pattern; otherwise a UUID is generated. The id is
 * exposed on req.id, res.locals.requestId, and the X-Request-Id header.
 */
export function requestId(req, res, next) {
    const inbound = req.headers?.['x-request-id'];
    const id =
        typeof inbound === 'string' && REQUEST_ID_PATTERN.test(inbound)
            ? inbound
            : crypto.randomUUID();

    req.id = id;
    res.locals.requestId = id;
    res.set('X-Request-Id', id);

    return next();
}
