// One-off: wipe the transaction history table. The Speed history import stored
// amount_usd as the fee-inclusive charged amount (Speed doesn't retain the
// pre-fee amount), producing wrong-looking totals like $32.22 instead of $30.
// There's no reliable way to recover the true pre-fee amount for those rows, so
// this clears all payment records rather than leaving incorrect ones in place.
// Balances are untouched — they're stored on users.balance, not derived from
// this table. New transactions going forward already store the correct
// pre-fee amount (this table was only ever wrong for the imported rows).
import { db, paymentsTable } from "../db/index.js";

async function main() {
  const result = await db.delete(paymentsTable).returning({ id: paymentsTable.id });
  console.log(`Deleted ${result.length} payment record(s).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
