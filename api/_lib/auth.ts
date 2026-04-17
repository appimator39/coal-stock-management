import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

const TOKEN_COOKIE = 'ct_auth';
const TOKEN_TTL = '30d';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export type Role = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

function getJwtSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set (min 32 chars). Generate with: openssl rand -base64 48');
  }
  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(user: User): Promise<string> {
  return await new SignJWT({ sub: user.id, email: user.email, role: user.role, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (!payload.sub || !payload.email || !payload.role || !payload.name) return null;
    return {
      id: String(payload.sub),
      email: String(payload.email),
      name: String(payload.name),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...rest] = c.trim().split('=');
      return [k, decodeURIComponent(rest.join('='))];
    }),
  );
}

export function setAuthCookie(res: VercelResponse, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${TOKEN_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${secure}`,
  );
}

export function clearAuthCookie(res: VercelResponse): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${TOKEN_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure}`,
  );
}

export async function getUserFromRequest(req: VercelRequest): Promise<User | null> {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[TOKEN_COOKIE];
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser(
  req: VercelRequest,
  res: VercelResponse,
): Promise<User | null> {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}

export async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
): Promise<User | null> {
  const user = await requireUser(req, res);
  if (!user) return null;
  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin only' });
    return null;
  }
  return user;
}

// Seed default users on first run — idempotent.
export async function ensureSeedUsers(): Promise<void> {
  const db = getDb();
  const existing = await db.execute({
    sql: 'SELECT COUNT(*) AS n FROM users',
  });
  const n = Number(existing.rows[0]?.n ?? 0);
  if (n > 0) return;

  const seeds: Array<{ email: string; password: string; name: string; role: Role }> = [
    {
      email: 'admin@coaltracker.app',
      password: 'Admin#CT2026!',
      name: 'Administrator',
      role: 'admin',
    },
    {
      email: 'user@coaltracker.app',
      password: 'User#CT2026!',
      name: 'Operator',
      role: 'user',
    },
  ];

  for (const s of seeds) {
    const hash = await hashPassword(s.password);
    await db.execute({
      sql: `INSERT OR IGNORE INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
      args: [crypto.randomUUID(), s.email, hash, s.name, s.role],
    });
  }
}
