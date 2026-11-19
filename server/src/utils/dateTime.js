export const CAIRO_TIMEZONE = 'Africa/Cairo';

/**
 * Formats a UTC Date into Africa/Cairo time string (NFR-DAT-02).
 */
export function formatCairoTime(date) {
    return new Intl.DateTimeFormat('ar-EG', {
        timeZone: CAIRO_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(date));
}

export function formatCairoDate(date) {
    return new Intl.DateTimeFormat('ar-EG', {
        timeZone: CAIRO_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date(date));
}

/**
 * Validates Egyptian mobile numbers (010, 011, 012, 015 + 8 digits) (FR-STU-10).
 */
export function isValidEgyptianPhone(phone) {
    return /^01[0125]\d{8}$/.test(String(phone || '').trim());
}
