/** Arabic message used when a failed submission has no safe backend message. */
export const FAILED_SUBMISSION_MESSAGE = 'تعذر حفظ التغييرات';

const SENSITIVE_KEYS = [
    'password',
    'token',
    'secret',
    'authorization',
    'nationalid',
    'national_id',
];

/**
 * Extracts only a safe backend `error.message`. Never returns `err.message`,
 * stack traces, database internals, credentials, tokens, or raw error objects.
 */
export function safeSubmissionMessage(error, fallback = FAILED_SUBMISSION_MESSAGE) {
    const message = error?.response?.data?.error?.message;
    if (typeof message === 'string' && message.trim()) {
        // Defensive: never surface obvious secrets if a server ever returned them.
        if (SENSITIVE_KEYS.some((k) => message.toLowerCase().includes(k))) return fallback;
        return message.trim();
    }
    return fallback;
}

/** Arabic failed-submission toast message, optionally prefixed. */
export function failedSubmissionMessage(error, fallback = FAILED_SUBMISSION_MESSAGE) {
    const detail = safeSubmissionMessage(error, '');
    return detail ? `تعذر حفظ التغييرات: ${detail}` : fallback;
}
