/**
 * `User.username` stores a staff member's email address used for login.
 * Validation is performed with Zod's email validator; this only normalises
 * case and surrounding whitespace before saving or comparing.
 */
export function normalizeEmail(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}
