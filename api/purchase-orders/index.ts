import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { ensureInit } from '../_lib/init';
import { requireAdmin, requireUser } from '../_lib/auth';

function poRow(r: any) {
  return {
    id: r.id,
    poNumber: r.po_number,
    date: r.date,
    vendorId: r.vendor_id,
    item: r.item,
    quantity: Number(r.quantity),
    pricePerTon: Number(r.price_per_ton),
    totalAmount: Number(r.total_amount),
    status: r.status,
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
        `SELECT id, po_number, date, vendor_id, item, quantity, price_per_ton,
                total_amount, status, notes
         FROM purchase_orders ORDER BY date DESC, po_number DESC`,
      );
      return res.json(r.rows.map(poRow));
    }

    if (req.method === 'POST') {
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
      const id = b.id ?? crypto.randomUUID();
      // Auto-generate PO number if not supplied
      let poNumber: string = b.poNumber;
      if (!poNumber) {
        const last = await db.execute(
          `SELECT po_number FROM purchase_orders ORDER BY rowid DESC LIMIT 1`,
        );
        const prev = last.rows[0]?.po_number as string | undefined;
        const m = prev ? /PO-(\d+)/.exec(prev) : null;
        const n = m ? parseInt(m[1], 10) + 1 : 1;
        poNumber = `PO-${String(n).padStart(4, '0')}`;
      }
      const total = qty * price;
      await db.execute({
        sql: `INSERT INTO purchase_orders
              (id, po_number, date, vendor_id, item, quantity, price_per_ton, total_amount, status, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        args: [id, poNumber, b.date, b.vendorId, b.item, qty, price, total, b.notes ?? null],
      });
      return res.json({ id, poNumber });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[purchase-orders]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
