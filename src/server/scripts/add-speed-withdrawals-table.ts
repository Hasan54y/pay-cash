// One-off: db:push fails on this database (drizzle-kit introspection quirk on the
// admin_settings primary key, unrelated to this change), so create this table
// directly. Matches the speedWithdrawalsTable declared in schema.ts. The table shape
// changed from the original withdrawal-link version (never used with real money) to
// the Instant Send version, so this drops and recreates rather than altering.
import { db } from "../db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`DROP TABLE IF EXISTS speed_withdrawals`);
  await db.execute(sql`
    CREATE TABLE speed_withdrawals (
      id text PRIMARY KEY,
      amount_usd numeric(10, 2) NOT NULL,
      destination text NOT NULL,
      method text NOT NULL,
      fees_sats numeric(20, 0),
      status text NOT NULL DEFAULT 'pending',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `);
  console.log("Done — speed_withdrawals table is in place (Instant Send shape).");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
