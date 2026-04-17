import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromRequest } from '../_lib/auth';
import { ensureInit } from '../_lib/init';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    await ensureInit();
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ user: null });
    return res.json({ user });
  } catch (e: any) {
    console.error('[auth/me]', e);
    return res.status(500).json({ error: e?.message ?? 'Failed' });
  }
}
