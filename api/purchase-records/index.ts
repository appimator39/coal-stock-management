import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { ensureInit } from '../_lib/init';
import { requireUser } from '../_lib/auth';
import { recomputePoStatus } from '../_lib/po-status';

function prRow(r: any) {
  return {
    id: r.id,
    date: r.date,
    poId: r.po_id,
    poNumber: r.po_number,
    vendor: r.vendor,
    item: r.item,
    quantity: Number(r.quantity),
    pricePerTon: Number(r.price_per_ton),
    totalAmount: Number(r.total_amount),
    builtyNumber: r.builty_number ?? undefined,
    truckNumber: r.truck_number ?? undefined,
    notes: r.notes ?? undefined,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    const db = getDb();

    if (req.method === 'GET') {
      if (!(await requireUser(req, res))) return;
      const r = await db.execute(
        `SELECT id, date, po_id, po_number, vendor, item, quantity, price_per_ton,
                total_amount, builty_number, truck_number, notes
         FROM purchase_records ORDER BY date DESC`,
      );
      return res.json(r.rows.map(prRow));
    }

    if (req.method === 'POST') {
      if (!(await requireUser(req, res))) return;
      const b = (req.body ?? {}) as any;
      if (!b.date || !b.poId || !b.quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      const qty = Number(b.quantity);
      if (qty <= 0) return res.status(400).json({ error: 'Invalid quantity' });

      // Validate against PO balance
      const po = await db.execute({
        sql: `SELECT po_number, vendor_id, item, quantity, price_per_ton FROM purchase_orders WHERE id = ?`,
        args: [b.poId],
      });
      if (po.rows.length === 0) {
        return res.status(400).json({ error: 'Purchase order not found' });
      }
      const poRow = po.rows[0] as any;
      const recv = await db.execute({
        sql: `SELECT COALESCE(SUM(quantity), 0) AS s FROM purchase_records WHERE po_id = ?`,
        args: [b.poId],
      });
      const existing = Number(recv.rows[0]?.s ?? 0);
      const remaining = Number(poRow.quantity) - existing;
      if (qty > remaining + 1e-6) {
        return res.status(400).json({
          error: `Quantity exceeds PO balance of ${remaining.toFixed(2)} tons`,
        });
      }

      // Resolve vendor name for denorm
      const vendor = await db.execute({
        sql: `SELECT name FROM vendors WHERE id = ?`,
        args: [poRow.vendor_id],
      });
      const vendorName = (vendor.rows[0]?.name as string) ?? '';
      const pricePerTon = Number(poRow.price_per_ton);
      const id = b.id ?? crypto.randomUUID();

      await db.execute({
        sql: `INSERT INTO purchase_records
              (id, date, po_id, po_number, vendor, item, quantity, price_per_ton,
               total_amount, builty_number, truck_number, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          b.date,
          b.poId,
          poRow.po_number,
          vendorName,
          poRow.item,
          qty,
          pricePerTon,
          qty * pricePerTon,
          b.builtyNumber ?? null,
          b.truckNumber ?? null,
          b.notes ?? null,
        ],
      });

      await recomputePoStatus(db, b.poId);
      return res.json({ id });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[purchase-records]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
