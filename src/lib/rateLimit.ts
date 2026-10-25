/**
 * In-memory & stateless rate limiter for auth & booking endpoints
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const sendOtpLimits = new Map<string, { lastSentAt: number }>();
const verifyOtpAttempts = new Map<string, { failedAttempts: number; lockedUntil: number }>();

export const COOLDOWN_SECONDS = 45;
export const MAX_VERIFY_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 10;

/**
 * Checks if a roll number is allowed to request a new OTP (45-second cooldown)
 */
export function checkSendOtpRateLimit(roll: string): { allowed: boolean; waitSeconds?: number } {
  const cleanRoll = roll.trim().toUpperCase();
  const record = sendOtpLimits.get(cleanRoll);
  const now = Date.now();

  if (record) {
    const elapsedSeconds = Math.floor((now - record.lastSentAt) / 1000);
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      return { allowed: false, waitSeconds: COOLDOWN_SECONDS - elapsedSeconds };
    }
  }

  sendOtpLimits.set(cleanRoll, { lastSentAt: now });
  return { allowed: true };
}

/**
 * Checks if a roll number has exceeded allowed OTP verification attempts
 */
export function checkVerifyOtpAttempts(roll: string): { allowed: boolean; remainingAttempts?: number; locked?: boolean } {
  const cleanRoll = roll.trim().toUpperCase();
  const record = verifyOtpAttempts.get(cleanRoll);
  const now = Date.now();

  if (record) {
    if (record.lockedUntil > now) {
      return { allowed: false, locked: true };
    }

    // Lock has expired, reset counter
    if (record.lockedUntil > 0 && record.lockedUntil <= now) {
      verifyOtpAttempts.delete(cleanRoll);
      return { allowed: true, remainingAttempts: MAX_VERIFY_ATTEMPTS };
    }

    const remaining = MAX_VERIFY_ATTEMPTS - record.failedAttempts;
    if (remaining <= 0) {
      record.lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
      return { allowed: false, locked: true };
    }

    return { allowed: true, remainingAttempts: remaining };
  }

  return { allowed: true, remainingAttempts: MAX_VERIFY_ATTEMPTS };
}

/**
 * Records a failed verification attempt
 */
export function recordFailedOtpAttempt(roll: string): { remainingAttempts: number; isLocked: boolean } {
  const cleanRoll = roll.trim().toUpperCase();
  const record = verifyOtpAttempts.get(cleanRoll) || { failedAttempts: 0, lockedUntil: 0 };
  const now = Date.now();

  record.failedAttempts += 1;

  if (record.failedAttempts >= MAX_VERIFY_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MINUTES * 60 * 1000;
    verifyOtpAttempts.set(cleanRoll, record);
    return { remainingAttempts: 0, isLocked: true };
  }

  verifyOtpAttempts.set(cleanRoll, record);
  return { remainingAttempts: MAX_VERIFY_ATTEMPTS - record.failedAttempts, isLocked: false };
}

/**
 * Resets failed attempts after successful verification
 */
export function clearFailedOtpAttempts(roll: string): void {
  verifyOtpAttempts.delete(roll.trim().toUpperCase());
}
