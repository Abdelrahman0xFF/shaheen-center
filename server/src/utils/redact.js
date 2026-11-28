const SENSITIVE_KEY_PATTERN =
    /password|passwordhash|newpassword|currentpassword|token|accesstoken|refreshtoken|refreshtokenhash|authorization|cookie|set-cookie|nationalid|nationalidencrypted|nationalidimageurl|encryptionkey|blindindexsecret|jwtsecret|secret|apikey/i;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 500;

/**
 * Deep-clones a value with sensitive keys redacted, depth/size limited, and
 * strings truncated. Safe for structured logging. Circular references are
 * replaced with '[CIRCULAR]'.
 */
export function redactSensitive(value, depth = 0, seen = new WeakSet()) {
    if (value === null || value === undefined) return value;

    const type = typeof value;
    if (type === 'string') {
        return value.length > MAX_STRING_LENGTH
            ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
            : value;
    }
    if (type === 'number' || type === 'boolean') return value;
    if (type === 'bigint') return value.toString();
    if (type === 'function' || type === 'symbol') return undefined;

    if (value instanceof Error) {
        return { name: value.name, message: String(value.message).slice(0, MAX_STRING_LENGTH) };
    }

    if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';

    if (Array.isArray(value)) {
        if (seen.has(value)) return '[CIRCULAR]';
        seen.add(value);
        return value
            .slice(0, MAX_ARRAY_ITEMS)
            .map((item) => redactSensitive(item, depth + 1, seen));
    }

    if (type === 'object') {
        if (seen.has(value)) return '[CIRCULAR]';
        seen.add(value);

        const out = {};
        for (const [key, val] of Object.entries(value)) {
            if (SENSITIVE_KEY_PATTERN.test(key)) {
                out[key] = REDACTED;
            } else {
                out[key] = redactSensitive(val, depth + 1, seen);
            }
        }
        return out;
    }

    return undefined;
}

export function isSensitiveKey(key) {
    return SENSITIVE_KEY_PATTERN.test(String(key));
}

export { REDACTED };
