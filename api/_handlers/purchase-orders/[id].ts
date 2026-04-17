import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/db.js';
import { ensureInit } from '../../_lib/init.js';
import { requireAdmin } from '../../_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    const { id } = req.query;
    if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });
    const db = getDb();

    if (req.method === 'PATCH') {
      if (!(await requireAdmin(req, res))) return;
      const b = (req.body ?? {}) as any;
      if (!b.date || !b.vendorId || !b.item || !b.quantity || b.pricePerTon == null) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const qty = Number(b.quantity);
      const price = Number(b.pricePerTon);
      if (qty <= 0 || price < 0) {
        return res.status(400).json({ error: 'Invalid quantity or price' });
      }
      // Can't reduce quantity below already-received qty
      const recv = await db.execute({
        sql: `SELECT COALESCE(SUM(quantity), 0) AS s FROM purchase_records WHERE po_id = ?`,
        args: [id],
      });
      const received = Number(recv.rows[0]?.s ?? 0);
      if (qty < received) {
        return res.status(400).json({
          error: `Quantity cannot be less than already received (${received}t)`,
        });
      }
      const total = qty * price;
      const status = received >= qty - 1e-6 ? 'fulfilled' : received > 1e-6 ? 'partial' : 'pending';
      await db.execute({
        sql: `UPDATE purchase_orders
              SET date=?, vendor_id=?, item=?, quantity=?, price_per_ton=?, total_amount=?,
                  status=?, notes=?, updated_at=datetime('now')
              WHERE id = ?`,
        args: [b.date, b.vendorId, b.item, qty, price, total, status, b.notes ?? null, id],
      });
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      const recv = await db.execute({
        sql: `SELECT COUNT(*) AS n FROM purchase_records WHERE po_id = ?`,
        args: [id],
      });
      const n = Number(recv.rows[0]?.n ?? 0);
      if (n > 0) {
        return res.status(409).json({
          error: `Cannot delete PO — ${n} linked purchase record(s). Delete those first.`,
        });
      }
      await db.execute({ sql: `DELETE FROM purchase_orders WHERE id = ?`, args: [id] });
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[purchase-orders/:id]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
