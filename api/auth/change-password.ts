import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { ensureInit } from '../_lib/init';
import { requireUser, verifyPassword, hashPassword } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await ensureInit();
    const u = await requireUser(req, res);
    if (!u) return;
    const { currentPassword, newPassword } = (req.body ?? {}) as any;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword required' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    const db = getDb();
    const row = await db.execute({
      sql: `SELECT password_hash FROM users WHERE id = ?`,
      args: [u.id],
    });
    if (row.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const ok = await verifyPassword(currentPassword, row.rows[0].password_hash as string);
    if (!ok) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await hashPassword(newPassword);
    await db.execute({
      sql: `UPDATE users SET password_hash = ? WHERE id = ?`,
      args: [hash, u.id],
    });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('[change-password]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
