import { eq } from "drizzle-orm";
import { getDb, getPool } from "@/db";
import { users } from "@/db/schema";
import { grantCredits } from "@/lib/core/ledger";

// Usage: npm run grant -- someone@example.com 1000 "Beta tester"
// Goes through the credit ledger, so the balance and the history always agree.
async function main() {
  const [email, amountRaw, ...note] = process.argv.slice(2);
  const amount = Number(amountRaw);
  if (!email || !Number.isInteger(amount) || amount <= 0) {
    console.error('Usage: npm run grant -- <email> <credits> ["note"]');
    process.exit(1);
  }
  const db = getDb();
  const user = (await db.select({ id: users.id }).from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1))[0];
  if (!user) {
    console.error(`No account with the email ${email}`);
    process.exit(1);
  }
  const r = await grantCredits(db, { userId: user.id, amount, kind: "adjust", note: note.join(" ") || "Added by admin" });
  console.log(`Added ${amount.toLocaleString("en-US")} credits to ${email}. New balance: ${r.balance.toLocaleString("en-US")}`);
  await getPool().end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
