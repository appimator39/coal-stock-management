import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/db.js';
import { ensureInit } from '../../_lib/init.js';
import { verifyPassword, signToken, setAuthCookie, type User } from '../../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await ensureInit();
    const { email, password } = (req.body ?? {}) as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const row = await db.execute({
      sql: `SELECT id, email, name, role, password_hash FROM users WHERE email = ?`,
      args: [email.trim().toLowerCase()],
    });

    if (row.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = row.rows[0] as any;
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const u: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const token = await signToken(u);
    setAuthCookie(res, token);
    return res.json({ user: u });
  } catch (e: any) {
    console.error('[auth/login]', e);
    return res.status(500).json({ error: e?.message ?? 'Login failed' });
  }
}
