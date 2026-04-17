import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { ensureInit } from '../_lib/init';
import { requireAdmin } from '../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    const { id } = req.query;
    if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });
    const db = getDb();

    if (req.method === 'PATCH') {
      if (!(await requireAdmin(req, res))) return;
      const b = (req.body ?? {}) as any;
      if (!b.name?.trim()) return res.status(400).json({ error: 'Name required' });
      try {
        await db.execute({
          sql: `UPDATE vendors SET name=?, phone=?, email=?, address=?, notes=?, updated_at=datetime('now') WHERE id=?`,
          args: [b.name.trim(), b.phone ?? null, b.email ?? null, b.address ?? null, b.notes ?? null, id],
        });
      } catch (e: any) {
        if (String(e?.message ?? '').includes('UNIQUE')) {
          return res.status(409).json({ error: 'Vendor name already exists' });
        }
        throw e;
      }
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      const ref = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM purchase_orders WHERE vendor_id = ?`,
        args: [id],
      });
      const n = Number(ref.rows[0]?.n ?? 0);
      if (n > 0) {
        return res.status(409).json({
          error: `Cannot delete vendor — referenced by ${n} purchase order(s).`,
        });
      }
      await db.execute({ sql: `DELETE FROM vendors WHERE id = ?`, args: [id] });
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[vendors/:id]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
