import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../_lib/db';
import { ensureInit } from '../_lib/init';
import { requireUser } from '../_lib/auth';
import { getStockByItem } from '../_lib/stock';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!(await requireUser(req, res))) return;
    const exclude =
      typeof req.query.excludeDailyId === 'string' ? req.query.excludeDailyId : undefined;
    const db = getDb();
    const stock = await getStockByItem(db, exclude);
    return res.json(stock);
  } catch (e: any) {
    console.error('[stock]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
