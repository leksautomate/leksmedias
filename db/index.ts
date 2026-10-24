import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Shared by the Next.js server and the worker. No `server-only` import here on purpose:
// the worker is plain Node and `server-only` throws outside Next's bundler.

const globalForDb = globalThis as unknown as { __leksPool?: Pool };

function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return new Pool({
    connectionString: url,
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export function getPool(): Pool {
  // Reuse one pool across hot reloads in dev so we do not exhaust connections.
  return (globalForDb.__leksPool ??= createPool());
}

export function getDb() {
  return drizzle(getPool(), { schema });
}

export type Db = ReturnType<typeof getDb>;
export { schema };
