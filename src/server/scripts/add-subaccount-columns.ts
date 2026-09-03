// One-off: `drizzle-kit push` chokes on the pre-existing admin_settings table's
// primary key during introspection, unrelated to this change. Add the two new
// users columns directly instead. Safe to run more than once.
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_user_id text`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin_sub_account boolean NOT NULL DEFAULT false`);
  console.log("Done — parent_user_id and is_admin_sub_account columns are present on users.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
