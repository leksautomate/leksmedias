import { sql } from "drizzle-orm";
import { getDb, getPool } from "@/db";
import { users } from "@/db/schema";

export const db = getDb();

export async function resetDb() {
  await db.execute(
    sql`truncate table users, sessions, email_tokens, auth_attempts, credit_ledger, runs, run_events, sources, facts, run_sections, scripts, llm_calls, provider_events, waitlist restart identity cascade`,
  );
}

let n = 0;
export async function makeUser(over: Partial<typeof users.$inferInsert> = {}) {
  n += 1;
  const [u] = await db
    .insert(users)
    .values({ email: `user${n}-${Date.now()}@example.com`, passwordHash: "x", ...over })
    .returning();
  return u;
}

export async function closeDb() {
  await getPool().end();
}
