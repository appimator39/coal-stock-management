import type { Client } from '@libsql/client';

export async function recomputePoStatus(db: Client, poId: string): Promise<void> {
  const po = await db.execute({
    sql: `SELECT quantity FROM purchase_orders WHERE id = ?`,
    args: [poId],
  });
  if (po.rows.length === 0) return;
  const ordered = Number(po.rows[0].quantity);
  const recv = await db.execute({
    sql: `SELECT COALESCE(SUM(quantity), 0) AS s FROM purchase_records WHERE po_id = ?`,
    args: [poId],
  });
  const received = Number(recv.rows[0]?.s ?? 0);
  let status: 'pending' | 'partial' | 'fulfilled' = 'pending';
  if (received >= ordered - 1e-6) status = 'fulfilled';
  else if (received > 1e-6) status = 'partial';
  await db.execute({
    sql: `UPDATE purchase_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [status, poId],
  });
}
