import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { ensureInit } from '../_lib/init';
import { requireUser, requireAdmin } from '../_lib/auth';
import { getStockByItem } from '../_lib/stock';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    const { id } = req.query;
    if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });
    const db = getDb();

    if (req.method === 'PATCH') {
      const u = await requireUser(req, res);
      if (!u) return;
      const b = (req.body ?? {}) as any;
      if (!b.date || !Array.isArray(b.items) || b.items.length === 0) {
        return res.status(400).json({ error: 'Missing date or items' });
      }
      const items = (b.items as any[]).filter((i) => i.itemName && Number(i.quantity) > 0);
      if (items.length === 0) return res.status(400).json({ error: 'No valid items' });

      // Stock check (exclude this record so its old qty doesn't count against itself)
      const stock = await getStockByItem(db, id);
      const required: Record<string, number> = {};
      for (const it of items) {
        required[it.itemName] = (required[it.itemName] ?? 0) + Number(it.quantity);
      }
      for (const [name, req] of Object.entries(required)) {
        const avail = stock[name] ?? 0;
        if (req > avail + 1e-6) {
          return res.status(409).json({
            error: `Not enough "${name}" in stock — requested ${req.toFixed(2)}t but only ${avail.toFixed(2)}t available.`,
          });
        }
      }

      const totalCoal = items.reduce((s, i) => s + Number(i.quantity), 0);
      const totalCost = items.reduce((s, i) => s + Number(i.quantity) * Number(i.costPerTon), 0);

      const stmts = [
        {
          sql: `UPDATE daily_records SET date=?, steam_produced=?, total_coal=?, total_cost=?, notes=?, updated_at=datetime('now') WHERE id=?`,
          args: [b.date, Number(b.steamProduced) || 0, totalCoal, totalCost, b.notes ?? null, id],
        },
        { sql: `DELETE FROM daily_record_items WHERE daily_record_id = ?`, args: [id] },
        ...items.map((i) => ({
          sql: `INSERT INTO daily_record_items (id, daily_record_id, item_name, quantity, cost_per_ton)
                VALUES (?, ?, ?, ?, ?)`,
          args: [crypto.randomUUID(), id, i.itemName, Number(i.quantity), Number(i.costPerTon)],
        })),
      ];
      await db.batch(stmts as any, 'write');
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      await db.execute({ sql: `DELETE FROM daily_records WHERE id = ?`, args: [id] });
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[daily-records/:id]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
