import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { getDb, getPool } from "./index";

// Run with: npm run db:migrate   (also runs at container start)
async function main() {
  const db = getDb();
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "db", "migrations") });
  console.log("migrations applied");
  await getPool().end();
}

main().catch((err) => {
  console.error("migration failed:", err);
  process.exit(1);
});
