/**
 * Normalises Egyptian mobile numbers to the local 11-digit form (01XXXXXXXXX).
 * Accepts +20, 0020, or bare 20 prefixes, plus spaces, dashes, and parentheses.
 * Returns null when the input is not a valid Egyptian mobile number.
 */
export function normalizeEgyptianPhone(value) {
    if (value === null || value === undefined) return null;

    let digits = String(value)
        .trim()
        .replace(/[\s\-()]/g, '');

    if (!digits) return null;

    if (digits.startsWith('+20')) {
        digits = `0${digits.slice(3)}`;
    } else if (digits.startsWith('0020')) {
        digits = `0${digits.slice(4)}`;
    } else if (/^20\d{10}$/.test(digits)) {
        digits = `0${digits.slice(2)}`;
    }

    return /^01[0125]\d{8}$/.test(digits) ? digits : null;
}

/**
 * An identifier is treated as a phone when it contains only phone-shaped
 * characters; otherwise it is treated as a username.
 */
export function looksLikePhoneIdentifier(value) {
    return /^[+\d\s\-()]+$/.test(String(value ?? '').trim());
}
