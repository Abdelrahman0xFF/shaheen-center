export const CAIRO_TIMEZONE = 'Africa/Cairo';

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const CAIRO_PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
    timeZone: CAIRO_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
});

function parseDateOnly(value) {
    const match = DATE_ONLY_RE.exec(String(value ?? '').trim());
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const probe = new Date(Date.UTC(year, month - 1, day));

    if (
        probe.getUTCFullYear() !== year ||
        probe.getUTCMonth() !== month - 1 ||
        probe.getUTCDate() !== day
    ) {
        return null;
    }

    return { year, month, day };
}

function cairoOffsetMs(utcMs) {
    const parts = CAIRO_PARTS_FORMATTER.formatToParts(new Date(utcMs));
    const values = {};
    for (const part of parts) {
        if (part.type !== 'literal') values[part.type] = part.value;
    }

    const asUtc = Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour) % 24,
        Number(values.minute),
        Number(values.second),
    );

    return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Converts a `YYYY-MM-DD` calendar date into the UTC instant of 00:00 in
 * Africa/Cairo. Returns null for malformed or impossible dates.
 */
export function cairoDateStartUtc(value) {
    const parsed = parseDateOnly(value);
    if (!parsed) return null;

    const localMidnightAsUtc = Date.UTC(parsed.year, parsed.month - 1, parsed.day);
    let offset = cairoOffsetMs(localMidnightAsUtc);
    // Re-evaluate at the candidate instant to settle DST-transition days.
    offset = cairoOffsetMs(localMidnightAsUtc - offset);

    return new Date(localMidnightAsUtc - offset);
}

/**
 * Converts a `YYYY-MM-DD` calendar date into the last millisecond of that day
 * in Africa/Cairo. Use for inclusive `lte` date filters.
 */
export function cairoDateEndUtc(value) {
    const parsed = parseDateOnly(value);
    if (!parsed) return null;

    const nextDay = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + 1));
    const nextDayString = [
        nextDay.getUTCFullYear(),
        String(nextDay.getUTCMonth() + 1).padStart(2, '0'),
        String(nextDay.getUTCDate()).padStart(2, '0'),
    ].join('-');

    const nextStart = cairoDateStartUtc(nextDayString);
    return nextStart ? new Date(nextStart.getTime() - 1) : null;
}

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
