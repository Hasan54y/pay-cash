// One-off: db:push fails on this database (drizzle-kit introspection quirk on the
// admin_settings primary key, unrelated to this change), so add these indexes
// directly. Matches the indexes declared in schema.ts. Safe to run more than once.
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`CREATE INDEX IF NOT EXISTS payments_user_id_created_at_idx ON payments (user_id, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS payments_status_created_at_idx ON payments (status, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS withdrawals_user_id_created_at_idx ON withdrawals (user_id, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions (user_id)`);
  console.log("Done — indexes are in place.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
