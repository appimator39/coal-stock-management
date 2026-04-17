import type { Client } from '@libsql/client';

/**
 * Compute current available stock per item name.
 *   stock = sum(purchase_records.quantity per item)
 *         - sum(daily_record_items.quantity per item_name)
 * When editing a daily record, pass `excludeDailyId` to ignore its consumption.
 */
export async function getStockByItem(
  db: Client,
  excludeDailyId?: string,
): Promise<Record<string, number>> {
  const stock: Record<string, number> = {};

  const pur = await db.execute(
    `SELECT item, COALESCE(SUM(quantity), 0) AS s FROM purchase_records GROUP BY item`,
  );
  for (const r of pur.rows as any[]) {
    stock[r.item] = (stock[r.item] ?? 0) + Number(r.s);
  }

  const consSql = excludeDailyId
    ? `SELECT item_name, COALESCE(SUM(quantity), 0) AS s
       FROM daily_record_items
       WHERE daily_record_id != ?
       GROUP BY item_name`
    : `SELECT item_name, COALESCE(SUM(quantity), 0) AS s
       FROM daily_record_items
       GROUP BY item_name`;
  const cons = excludeDailyId
    ? await db.execute({ sql: consSql, args: [excludeDailyId] })
    : await db.execute(consSql);

  for (const r of cons.rows as any[]) {
    stock[r.item_name] = (stock[r.item_name] ?? 0) - Number(r.s);
  }

  return stock;
}
