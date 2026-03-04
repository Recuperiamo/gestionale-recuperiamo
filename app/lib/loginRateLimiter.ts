// @ts-nocheck
/**
 * In-memory rate limiter for login attempts.
 * Tracks failed attempts per email address.
 * Resets automatically after WINDOW_MS, and on successful login.
 *
 * Note: state is per-process. On Vercel, each cold start resets counters —
 * this is acceptable for a private management application.
 */

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/** @type {Map<string, { count: number, firstAttempt: number }>} */
const attempts = new Map();

/**
 * Check if a login attempt is allowed.
 * Increments the counter for failed tracking (call resetRateLimit on success).
 * @param {string} email
 * @returns {{ allowed: boolean, retryAfterMinutes?: number }}
 */
export function checkRateLimit(email) {
  const key = email.toLowerCase();
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttempt: now });
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterMinutes = Math.ceil((WINDOW_MS - (now - record.firstAttempt)) / 60000);
    return { allowed: false, retryAfterMinutes };
  }

  record.count++;
  return { allowed: true };
}

/**
 * Reset the counter for an email after a successful login.
 * @param {string} email
 */
export function resetRateLimit(email) {
  attempts.delete(email.toLowerCase());
}
