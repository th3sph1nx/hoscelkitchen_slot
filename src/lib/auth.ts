import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { ADMIN_ROLL } from './types';

export interface SessionUser {
  roll: string;
  email: string;
  isAdmin: boolean;
  exp: number;
}

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  crypto.randomBytes(32).toString('hex');

export const SESSION_COOKIE_NAME = 'ganga_session';

/**
 * Creates a cryptographically signed session token: base64(payload).signature
 */
export function createSessionToken(user: { roll: string; email: string; isAdmin: boolean }): string {
  const roll = user.roll.trim().toUpperCase();
  const isAdmin = roll === ADMIN_ROLL;
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days validity

  const payload: SessionUser = {
    roll,
    email: user.email.trim().toLowerCase(),
    isAdmin,
    exp,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');

  return `${payloadB64}.${signature}`;
}

/**
 * Verifies the cryptographic signature and expiration of a session token
 */
export function verifySessionToken(token: string | undefined | null): SessionUser | null {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', SESSION_SECRET).update(payloadB64).digest('base64url');

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: SessionUser = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.roll || !payload.exp || Date.now() > payload.exp) {
      return null;
    }

    // Re-verify admin status against current ADMIN_ROLL constant
    payload.isAdmin = payload.roll.toUpperCase() === ADMIN_ROLL;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from the request's HttpOnly cookie or Authorization header
 */
export function getSessionUser(req: NextRequest): SessionUser | null {
  // 1. Try HttpOnly cookie
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) {
    const user = verifySessionToken(cookieToken);
    if (user) return user;
  }

  // 2. Try Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    return verifySessionToken(bearerToken);
  }

  return null;
}

/**
 * Helper to ensure the request is from an authenticated admin
 */
export function verifyAdminAccess(req: NextRequest): { authorized: boolean; user: SessionUser | null; error?: string } {
  const user = getSessionUser(req);
  if (!user) {
    return { authorized: false, user: null, error: 'Unauthorized: Authentication required. Please log in.' };
  }

  if (!user.isAdmin || user.roll.toUpperCase() !== ADMIN_ROLL) {
    return {
      authorized: false,
      user,
      error: `Forbidden: Admin role required (${ADMIN_ROLL}). Roll ${user.roll} does not have admin privileges.`,
    };
  }

  return { authorized: true, user };
}
