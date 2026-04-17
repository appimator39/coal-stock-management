import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/db.js';
import { ensureInit } from '../../_lib/init.js';
import { requireAdmin, requireUser } from '../../_lib/auth.js';
import { recomputePoStatus } from '../../_lib/po-status.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    const { id } = req.query;
    if (typeof id !== 'string') return res.status(400).json({ error: 'Invalid id' });
    const db = getDb();

    if (req.method === 'PATCH') {
      if (!(await requireUser(req, res))) return;
      const b = (req.body ?? {}) as any;
      if (!b.date || b.quantity == null) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const qty = Number(b.quantity);
      if (qty <= 0) return res.status(400).json({ error: 'Invalid quantity' });

      // Locate record to know po_id
      const prev = await db.execute({
        sql: `SELECT po_id, price_per_ton FROM purchase_records WHERE id = ?`,
        args: [id],
      });
      if (prev.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const poId = prev.rows[0].po_id as string;
      const pricePerTon = Number(prev.rows[0].price_per_ton);

      // Balance check excluding this record
      const po = await db.execute({
        sql: `SELECT quantity FROM purchase_orders WHERE id = ?`,
        args: [poId],
      });
      const ordered = Number(po.rows[0]?.quantity ?? 0);
      const other = await db.execute({
        sql: `SELECT COALESCE(SUM(quantity), 0) AS s FROM purchase_records WHERE po_id = ? AND id != ?`,
        args: [poId, id],
      });
      const maxAllowed = ordered - Number(other.rows[0]?.s ?? 0);
      if (qty > maxAllowed + 1e-6) {
        return res.status(400).json({
          error: `Quantity exceeds PO balance of ${maxAllowed.toFixed(2)} tons`,
        });
      }

      await db.execute({
        sql: `UPDATE purchase_records
              SET date=?, quantity=?, total_amount=?, builty_number=?, truck_number=?, notes=?,
                  updated_at=datetime('now')
              WHERE id=?`,
        args: [b.date, qty, qty * pricePerTon, b.builtyNumber ?? null, b.truckNumber ?? null, b.notes ?? null, id],
      });
      await recomputePoStatus(db, poId);
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      const prev = await db.execute({
        sql: `SELECT po_id FROM purchase_records WHERE id = ?`,
        args: [id],
      });
      const poId = prev.rows[0]?.po_id as string | undefined;
      await db.execute({ sql: `DELETE FROM purchase_records WHERE id = ?`, args: [id] });
      if (poId) await recomputePoStatus(db, poId);
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[purchase-records/:id]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
