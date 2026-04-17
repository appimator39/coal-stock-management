import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../_lib/db';
import { ensureInit } from '../../_lib/init';
import { requireAdmin, requireUser } from '../../_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await ensureInit();
    const db = getDb();

    if (req.method === 'GET') {
      if (!(await requireUser(req, res))) return;
      const r = await db.execute(`SELECT id, name, description FROM items ORDER BY name ASC`);
      return res.json(r.rows);
    }

    if (req.method === 'POST') {
      if (!(await requireAdmin(req, res))) return;
      const b = (req.body ?? {}) as any;
      if (!b.name?.trim()) return res.status(400).json({ error: 'Name required' });
      const id = b.id ?? crypto.randomUUID();
      try {
        await db.execute({
          sql: `INSERT INTO items (id, name, description) VALUES (?, ?, ?)`,
          args: [id, b.name.trim(), b.description ?? null],
        });
      } catch (e: any) {
        if (String(e?.message ?? '').includes('UNIQUE')) {
          return res.status(409).json({ error: 'Item name already exists' });
        }
        throw e;
      }
      return res.json({ id });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e: any) {
    console.error('[items]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
