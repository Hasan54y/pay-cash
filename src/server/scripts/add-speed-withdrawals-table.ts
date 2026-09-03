// One-off: db:push fails on this database (drizzle-kit introspection quirk on the
// admin_settings primary key, unrelated to this change), so create this table
// directly. Matches the speedWithdrawalsTable declared in schema.ts.
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS speed_withdrawals (
      id text PRIMARY KEY,
      amount_usd numeric(10, 2) NOT NULL,
      url text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  console.log("Done — speed_withdrawals table is in place.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
