import { createClient, type Client } from '@libsql/client/web';

let _client: Client | null = null;

function getEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `Missing required env var: ${name}. Set it in Vercel project settings or .env file.`,
    );
  }
  return val;
}

export function getDb(): Client {
  if (_client) return _client;
  _client = createClient({
    url: getEnv('TURSO_DATABASE_URL'),
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return _client;
}
