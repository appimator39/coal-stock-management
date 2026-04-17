// Turso / LibSQL schema + migrations. Idempotent — safe to run on every cold start.
// Migrations are stored in __meta(schema_version) so bumping the number
// re-runs new migrations automatically.

import type { Client } from '@libsql/client';

export const SCHEMA_VERSION = 1;

const MIGRATIONS: Record<number, string[]> = {
  1: [
    `CREATE TABLE IF NOT EXISTS __meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,

    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','user')) DEFAULT 'user',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      phone TEXT,
      email TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

    `CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      item TEXT NOT NULL,
      quantity REAL NOT NULL CHECK (quantity > 0),
      price_per_ton REAL NOT NULL CHECK (price_per_ton >= 0),
      total_amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','partial','fulfilled')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_po_vendor ON purchase_orders(vendor_id)`,
    `CREATE INDEX IF NOT EXISTS idx_po_date ON purchase_orders(date)`,
    `CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status)`,

    `CREATE TABLE IF NOT EXISTS purchase_records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      po_id TEXT NOT NULL,
      po_number TEXT NOT NULL,
      vendor TEXT NOT NULL,
      item TEXT NOT NULL,
      quantity REAL NOT NULL CHECK (quantity > 0),
      price_per_ton REAL NOT NULL CHECK (price_per_ton >= 0),
      total_amount REAL NOT NULL,
      builty_number TEXT,
      truck_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pr_po ON purchase_records(po_id)`,
    `CREATE INDEX IF NOT EXISTS idx_pr_date ON purchase_records(date)`,

    `CREATE TABLE IF NOT EXISTS daily_records (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      steam_produced REAL NOT NULL DEFAULT 0,
      total_coal REAL NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_dr_date ON daily_records(date)`,

    `CREATE TABLE IF NOT EXISTS daily_record_items (
      id TEXT PRIMARY KEY,
      daily_record_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      quantity REAL NOT NULL CHECK (quantity >= 0),
      cost_per_ton REAL NOT NULL CHECK (cost_per_ton >= 0),
      FOREIGN KEY (daily_record_id) REFERENCES daily_records(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_dri_daily ON daily_record_items(daily_record_id)`,
    `CREATE INDEX IF NOT EXISTS idx_dri_item ON daily_record_items(item_name)`,

    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ],
};

let _migrationsRun = false;

export async function runMigrations(db: Client): Promise<void> {
  if (_migrationsRun) return;

  // Ensure meta table exists before reading version
  await db.execute(`CREATE TABLE IF NOT EXISTS __meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const row = await db.execute({
    sql: `SELECT value FROM __meta WHERE key = 'schema_version'`,
  });
  const current = row.rows[0]?.value ? parseInt(row.rows[0].value as string, 10) : 0;

  if (current >= SCHEMA_VERSION) {
    _migrationsRun = true;
    return;
  }

  for (let v = current + 1; v <= SCHEMA_VERSION; v++) {
    const stmts = MIGRATIONS[v];
    if (!stmts) throw new Error(`Missing migration v${v}`);
    for (const sql of stmts) {
      await db.execute(sql);
    }
  }

  await db.execute({
    sql: `INSERT INTO __meta (key, value) VALUES ('schema_version', ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    args: [String(SCHEMA_VERSION)],
  });

  _migrationsRun = true;
}
