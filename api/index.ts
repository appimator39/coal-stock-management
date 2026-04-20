// Single-function router — dispatches every /api/* request to the right handler.
// Consolidated into one file to stay under Vercel Hobby's 12-function cap.

import type { VercelRequest, VercelResponse } from '@vercel/node';

import loginHandler from './_handlers/auth/login.js';
import logoutHandler from './_handlers/auth/logout.js';
import meHandler from './_handlers/auth/me.js';
import changePasswordHandler from './_handlers/auth/change-password.js';

import vendorsIndexHandler from './_handlers/vendors/index.js';
import vendorIdHandler from './_handlers/vendors/[id].js';

import itemsIndexHandler from './_handlers/items/index.js';
import itemIdHandler from './_handlers/items/[id].js';

import purchaseOrdersIndexHandler from './_handlers/purchase-orders/index.js';
import purchaseOrderIdHandler from './_handlers/purchase-orders/[id].js';

import purchaseRecordsIndexHandler from './_handlers/purchase-records/index.js';
import purchaseRecordIdHandler from './_handlers/purchase-records/[id].js';

import dailyRecordsIndexHandler from './_handlers/daily-records/index.js';
import dailyRecordIdHandler from './_handlers/daily-records/[id].js';

import paymentsIndexHandler from './_handlers/payments/index.js';
import paymentIdHandler from './_handlers/payments/[id].js';

import settingsHandler from './_handlers/settings.js';
import stockHandler from './_handlers/stock.js';

type Handler = (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>;

interface Route {
  match: (segments: string[]) => Record<string, string> | null;
  handler: Handler;
}

const routes: Route[] = [
  // Auth
  { match: (s) => (s.length === 2 && s[0] === 'auth' && s[1] === 'login' ? {} : null), handler: loginHandler },
  { match: (s) => (s.length === 2 && s[0] === 'auth' && s[1] === 'logout' ? {} : null), handler: logoutHandler },
  { match: (s) => (s.length === 2 && s[0] === 'auth' && s[1] === 'me' ? {} : null), handler: meHandler },
  { match: (s) => (s.length === 2 && s[0] === 'auth' && s[1] === 'change-password' ? {} : null), handler: changePasswordHandler },

  // Vendors
  { match: (s) => (s.length === 1 && s[0] === 'vendors' ? {} : null), handler: vendorsIndexHandler },
  { match: (s) => (s.length === 2 && s[0] === 'vendors' ? { id: s[1] } : null), handler: vendorIdHandler },

  // Items
  { match: (s) => (s.length === 1 && s[0] === 'items' ? {} : null), handler: itemsIndexHandler },
  { match: (s) => (s.length === 2 && s[0] === 'items' ? { id: s[1] } : null), handler: itemIdHandler },

  // Purchase orders
  { match: (s) => (s.length === 1 && s[0] === 'purchase-orders' ? {} : null), handler: purchaseOrdersIndexHandler },
  { match: (s) => (s.length === 2 && s[0] === 'purchase-orders' ? { id: s[1] } : null), handler: purchaseOrderIdHandler },

  // Purchase records
  { match: (s) => (s.length === 1 && s[0] === 'purchase-records' ? {} : null), handler: purchaseRecordsIndexHandler },
  { match: (s) => (s.length === 2 && s[0] === 'purchase-records' ? { id: s[1] } : null), handler: purchaseRecordIdHandler },

  // Daily records
  { match: (s) => (s.length === 1 && s[0] === 'daily-records' ? {} : null), handler: dailyRecordsIndexHandler },
  { match: (s) => (s.length === 2 && s[0] === 'daily-records' ? { id: s[1] } : null), handler: dailyRecordIdHandler },

  // Payments
  { match: (s) => (s.length === 1 && s[0] === 'payments' ? {} : null), handler: paymentsIndexHandler },
  { match: (s) => (s.length === 2 && s[0] === 'payments' ? { id: s[1] } : null), handler: paymentIdHandler },

  // Singletons
  { match: (s) => (s.length === 1 && s[0] === 'settings' ? {} : null), handler: settingsHandler },
  { match: (s) => (s.length === 1 && s[0] === 'stock' ? {} : null), handler: stockHandler },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const url = req.url ?? '';
    const pathname = url.split('?')[0];
    const stripped = pathname.replace(/^\/api\/?/, '');
    const segments: string[] = stripped.split('/').filter(Boolean);

    // Diagnostic endpoint — does NOT hit the DB, only checks env vars.
    // GET /api/_debug
    if (segments.length === 1 && segments[0] === '_debug') {
      return res.json({
        ok: true,
        env: {
          TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ? 'set' : 'MISSING',
          TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? 'set' : 'MISSING',
          JWT_SECRET: process.env.JWT_SECRET
            ? `set (${process.env.JWT_SECRET.length} chars)`
            : 'MISSING',
          NODE_ENV: process.env.NODE_ENV,
          VERCEL_ENV: process.env.VERCEL_ENV,
          VERCEL_REGION: process.env.VERCEL_REGION,
        },
        node: process.version,
        routeCount: routes.length,
      });
    }

    for (const route of routes) {
      const params = route.match(segments);
      if (params) {
        req.query = { ...req.query, ...params };
        return await route.handler(req, res);
      }
    }

    return res.status(404).json({ error: `Not found: /api/${segments.join('/')}` });
  } catch (e: any) {
    console.error('[api/router] Unhandled error:', e);
    if (!res.headersSent) {
      return res.status(500).json({
        error: e?.message ?? 'Internal server error',
        stack: e?.stack,
        name: e?.name,
      });
    }
  }
}
