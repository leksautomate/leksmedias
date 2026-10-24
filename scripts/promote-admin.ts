import { eq } from "drizzle-orm";
import { getDb, getPool } from "@/db";
import { users } from "@/db/schema";

// Usage: npm run admin:promote -- you@example.com   (add --demote to remove admin)
async function main() {
  const args = process.argv.slice(2);
  const demote = args.includes("--demote");
  const email = args.find((a) => !a.startsWith("--"));
  if (!email) {
    console.error("Usage: npm run admin:promote -- <email> [--demote]");
    process.exit(1);
  }
  const rows = await getDb()
    .update(users)
    .set({ role: demote ? "user" : "admin", updatedAt: new Date() })
    .where(eq(users.email, email.trim().toLowerCase()))
    .returning({ email: users.email, role: users.role });
  if (!rows.length) {
    console.error(`No account with the email ${email}`);
    process.exit(1);
  }
  console.log(`${rows[0].email} is now ${rows[0].role}`);
  await getPool().end();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
