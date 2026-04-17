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
          sql: `UPDATE items SET name=?, description=?, updated_at=datetime('now') WHERE id=?`,
          args: [b.name.trim(), b.description ?? null, id],
        });
      } catch (e: any) {
        if (String(e?.message ?? '').includes('UNIQUE')) {
          return res.status(409).json({ error: 'Item name already exists' });
        }
        throw e;
      }
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      const row = await db.execute({
        sql: `SELECT name FROM items WHERE id = ?`,
        args: [id],
      });
      if (row.rows.length === 0) return res.json({ ok: true });
      const name = row.rows[0].name as string;
      const [po, pr, dr] = await Promise.all([
        db.execute({ sql: `SELECT COUNT(*) AS n FROM purchase_orders WHERE item = ?`, args: [name] }),
        db.execute({ sql: `SELECT COUNT(*) AS n FROM purchase_records WHERE item = ?`, args: [name] }),
        db.execute({ sql: `SELECT COUNT(*) AS n FROM daily_record_items WHERE item_name = ?`, args: [name] }),
      ]);
      const total =
        Number(po.rows[0]?.n ?? 0) + Number(pr.rows[0]?.n ?? 0) + Number(dr.rows[0]?.n ?? 0);
      if (total > 0) {
        return res.status(409).json({
          error: `Cannot delete item "${name}" — referenced by ${total} record(s).`,
        });
      }
      await db.execute({ sql: `DELETE FROM items WHERE id = ?`, args: [id] });
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[items/:id]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
