import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/db.js';
import { ensureInit } from '../../_lib/init.js';
import { requireAdmin, requireUser } from '../../_lib/auth.js';
import { getStockByItem } from '../../_lib/stock.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    const db = getDb();

    if (req.method === 'GET') {
      const u = await requireUser(req, res);
      if (!u) return;
      const recs = await db.execute(
        `SELECT id, date, steam_produced, total_coal, total_cost, notes
         FROM daily_records ORDER BY date DESC`,
      );
      if (recs.rows.length === 0) return res.json([]);
      const ids = recs.rows.map((r: any) => r.id);
      const placeholders = ids.map(() => '?').join(',');
      const items = await db.execute({
        sql: `SELECT id, daily_record_id, item_name, quantity, cost_per_ton
              FROM daily_record_items WHERE daily_record_id IN (${placeholders})`,
        args: ids,
      });
      const byRec = new Map<string, any[]>();
      for (const it of items.rows as any[]) {
        const arr = byRec.get(it.daily_record_id) ?? [];
        arr.push({
          id: it.id,
          itemName: it.item_name,
          quantity: Number(it.quantity),
          costPerTon: Number(it.cost_per_ton),
        });
        byRec.set(it.daily_record_id, arr);
      }
      return res.json(
        recs.rows.map((r: any) => ({
          id: r.id,
          date: r.date,
          steamProduced: Number(r.steam_produced),
          totalCoal: Number(r.total_coal),
          totalCost: Number(r.total_cost),
          notes: r.notes ?? undefined,
          items: byRec.get(r.id) ?? [],
        })),
      );
    }

    if (req.method === 'POST') {
      const u = await requireAdmin(req, res);
      if (!u) return;
      const b = (req.body ?? {}) as any;
      if (!b.date || !Array.isArray(b.items) || b.items.length === 0) {
        return res.status(400).json({ error: 'Missing date or items' });
      }
      const items = (b.items as any[]).filter((i) => i.itemName && Number(i.quantity) > 0);
      if (items.length === 0) return res.status(400).json({ error: 'No valid items' });

      // Stock check
      const stock = await getStockByItem(db);
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

      const id = b.id ?? crypto.randomUUID();
      const totalCoal = items.reduce((s, i) => s + Number(i.quantity), 0);
      const totalCost = items.reduce((s, i) => s + Number(i.quantity) * Number(i.costPerTon), 0);

      const stmts = [
        {
          sql: `INSERT INTO daily_records (id, date, steam_produced, total_coal, total_cost, notes, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [id, b.date, Number(b.steamProduced) || 0, totalCoal, totalCost, b.notes ?? null, u.id],
        },
        ...items.map((i) => ({
          sql: `INSERT INTO daily_record_items (id, daily_record_id, item_name, quantity, cost_per_ton)
                VALUES (?, ?, ?, ?, ?)`,
          args: [crypto.randomUUID(), id, i.itemName, Number(i.quantity), Number(i.costPerTon)],
        })),
      ];
      await db.batch(stmts as any, 'write');
      return res.json({ id });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[daily-records]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
