import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db.js';
import { ensureInit } from '../_lib/init.js';
import { requireUser, requireAdmin } from '../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    const db = getDb();

    if (req.method === 'GET') {
      if (!(await requireUser(req, res))) return;
      const r = await db.execute(`SELECT key, value FROM settings`);
      const settings: Record<string, string> = {};
      for (const row of r.rows as any[]) settings[row.key] = row.value;

      // Also include counts
      const [v, i, po, pr, dr] = await Promise.all([
        db.execute(`SELECT COUNT(*) AS n FROM vendors`),
        db.execute(`SELECT COUNT(*) AS n FROM items`),
        db.execute(`SELECT COUNT(*) AS n FROM purchase_orders`),
        db.execute(`SELECT COUNT(*) AS n FROM purchase_records`),
        db.execute(`SELECT COUNT(*) AS n FROM daily_records`),
      ]);
      return res.json({
        settings,
        counts: {
          vendors: Number(v.rows[0]?.n ?? 0),
          items: Number(i.rows[0]?.n ?? 0),
          purchaseOrders: Number(po.rows[0]?.n ?? 0),
          purchaseRecords: Number(pr.rows[0]?.n ?? 0),
          dailyRecords: Number(dr.rows[0]?.n ?? 0),
        },
      });
    }

    if (req.method === 'PUT') {
      if (!(await requireAdmin(req, res))) return;
      const b = (req.body ?? {}) as any;
      if (!b.key || b.value == null) return res.status(400).json({ error: 'key + value required' });
      await db.execute({
        sql: `INSERT INTO settings (key, value) VALUES (?, ?)
              ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`,
        args: [b.key, String(b.value)],
      });
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      await db.batch(
        [
          `DELETE FROM daily_record_items`,
          `DELETE FROM daily_records`,
          `DELETE FROM purchase_records`,
          `DELETE FROM purchase_orders`,
          `DELETE FROM items`,
          `DELETE FROM vendors`,
          `DELETE FROM settings`,
        ],
        'write',
      );
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[settings]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
