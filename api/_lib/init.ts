import { getDb } from './db.js';
import { runMigrations } from './schema.js';
import { ensureSeedUsers } from './auth.js';

let _initialised: Promise<void> | null = null;

/** Run schema migrations + seed default users exactly once per process. */
export function ensureInit(): Promise<void> {
  if (!_initialised) {
    _initialised = (async () => {
      const db = getDb();
      await runMigrations(db);
      await ensureSeedUsers();
    })();
  }
  return _initialised;
}
