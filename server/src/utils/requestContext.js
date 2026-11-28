/**
 * Request metadata helpers. Values stored in the database or logs are
 * truncated and stripped of control characters to prevent log injection.
 */

export function getClientIp(req) {
    const raw = req?.ip || req?.socket?.remoteAddress || null;
    if (!raw) return null;

    const value = String(raw).trim();
    if (!value) return null;

    // Normalise IPv4-mapped IPv6 addresses (::ffff:127.0.0.1 → 127.0.0.1).
    return value.startsWith('::ffff:') ? value.slice(7) : value.slice(0, 64);
}

export function getUserAgent(req) {
    const raw = req?.headers?.['user-agent'];
    if (!raw) return null;

    return (
        String(raw)
            .replace(/[\u0000-\u001F\u007F]/g, '')
            .trim()
            .slice(0, 255) || null
    );
}

export function getRequestOrigin(req) {
    const origin = req?.headers?.origin;
    if (origin) return String(origin).trim();

    const referer = req?.headers?.referer;
    if (!referer) return null;

    try {
        return new URL(referer).origin;
    } catch {
        return null;
    }
}
