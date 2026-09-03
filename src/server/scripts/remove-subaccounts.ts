// One-off: delete every sub-account (created by a sub-admin) and admin-owned extra
// payment page, as part of fully rolling back the multi-account feature. Their own
// transaction records are left in place (payments.user_id just points at a removed
// row); only the users rows themselves are deleted.
import { db, usersTable } from "../db/index.js";
import { or, eq, isNotNull } from "drizzle-orm";

async function main() {
  const toRemove = await db.select({ id: usersTable.id, displayName: usersTable.displayName, username: usersTable.username })
    .from(usersTable)
    .where(or(isNotNull(usersTable.parentUserId), eq(usersTable.isAdminSubAccount, true)));

  console.log(`Removing ${toRemove.length} account(s):`, toRemove.map(u => `${u.displayName} (@${u.username})`));

  await db.delete(usersTable).where(or(isNotNull(usersTable.parentUserId), eq(usersTable.isAdminSubAccount, true)));

  console.log("Done.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
