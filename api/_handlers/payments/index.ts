import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/db.js';
import { ensureInit } from '../../_lib/init.js';
import { requireAdmin, requireUser } from '../../_lib/auth.js';

function payRow(r: any) {
  return {
    id: r.id,
    vendorId: r.vendor_id,
    vendorName: r.vendor_name ?? undefined,
    ciNo: r.ci_no ?? undefined,
    amount: Number(r.amount),
    chequeNo: r.cheque_no ?? undefined,
    bankName: r.bank_name ?? undefined,
    chequeDate: r.cheque_date ?? undefined,
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
        `SELECT p.id, p.vendor_id, v.name AS vendor_name, p.ci_no, p.amount,
                p.cheque_no, p.bank_name, p.cheque_date, p.notes
         FROM payments p
         LEFT JOIN vendors v ON v.id = p.vendor_id
         ORDER BY COALESCE(p.cheque_date, p.created_at) DESC, p.created_at DESC`,
      );
      return res.json(r.rows.map(payRow));
    }

    if (req.method === 'POST') {
      if (!(await requireAdmin(req, res))) return;
      const b = (req.body ?? {}) as any;
      if (!b.vendorId || b.amount == null) {
        return res.status(400).json({ error: 'vendorId and amount are required' });
      }
      const amt = Number(b.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const vendor = await db.execute({
        sql: `SELECT id FROM vendors WHERE id = ?`,
        args: [b.vendorId],
      });
      if (vendor.rows.length === 0) {
        return res.status(400).json({ error: 'Vendor not found' });
      }

      const id = b.id ?? crypto.randomUUID();
      await db.execute({
        sql: `INSERT INTO payments
              (id, vendor_id, ci_no, amount, cheque_no, bank_name, cheque_date, notes)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          b.vendorId,
          b.ciNo?.trim() ? b.ciNo.trim() : null,
          amt,
          b.chequeNo?.trim() ? b.chequeNo.trim() : null,
          b.bankName?.trim() ? b.bankName.trim() : null,
          b.chequeDate ?? null,
          b.notes?.trim() ? b.notes.trim() : null,
        ],
      });
      return res.json({ id });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[payments]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
