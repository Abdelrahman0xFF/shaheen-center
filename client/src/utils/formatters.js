export const CAIRO_TIMEZONE = 'Africa/Cairo';

/**
 * Formats EGP monetary amounts in Arabic Egyptian locale (UI-01, NFR-DAT-02).
 */
export function formatEgp(amount) {
    const numeric = Number(amount ?? 0);
    return new Intl.NumberFormat('ar-EG', {
        style: 'currency',
        currency: 'EGP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(Number.isNaN(numeric) ? 0 : numeric);
}

/**
 * Formats UTC ISO timestamp to Africa/Cairo date.
 */
export function formatDateCairo(isoDate) {
    if (!isoDate) return '—';
    return new Intl.DateTimeFormat('ar-EG', {
        timeZone: CAIRO_TIMEZONE,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    }).format(new Date(isoDate));
}

/**
 * Formats UTC ISO timestamp to Africa/Cairo time (HH:MM).
 */
export function formatTimeCairo(isoDate) {
    if (!isoDate) return '—';
    return new Intl.DateTimeFormat('ar-EG', {
        timeZone: CAIRO_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(isoDate));
}

export function isValidEgyptianPhone(phone) {
    return /^01[0125]\d{8}$/.test(String(phone || '').trim());
}

export const ROLE_LABELS_AR = {
    ADMIN: 'مدير النظام',
    BRANCH_MANAGER: 'مدير فرع',
    SECRETARY: 'سكرتير / استقبال',
    INSTRUCTOR: 'مدرس',
    STUDENT: 'طالب',
};
