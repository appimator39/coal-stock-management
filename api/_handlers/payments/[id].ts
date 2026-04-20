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
      if (!b.vendorId || b.amount == null) {
        return res.status(400).json({ error: 'vendorId and amount are required' });
      }
      const amt = Number(b.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const exists = await db.execute({
        sql: `SELECT id FROM payments WHERE id = ?`,
        args: [id],
      });
      if (exists.rows.length === 0) return res.status(404).json({ error: 'Not found' });

      await db.execute({
        sql: `UPDATE payments
              SET vendor_id=?, ci_no=?, amount=?, cheque_no=?, bank_name=?,
                  cheque_date=?, notes=?, updated_at=datetime('now')
              WHERE id=?`,
        args: [
          b.vendorId,
          b.ciNo?.trim() ? b.ciNo.trim() : null,
          amt,
          b.chequeNo?.trim() ? b.chequeNo.trim() : null,
          b.bankName?.trim() ? b.bankName.trim() : null,
          b.chequeDate ?? null,
          b.notes?.trim() ? b.notes.trim() : null,
          id,
        ],
      });
      return res.json({ ok: true });
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      await db.execute({ sql: `DELETE FROM payments WHERE id = ?`, args: [id] });
      return res.json({ ok: true });
    }

    res.setHeader('Allow', 'PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[payments/:id]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
