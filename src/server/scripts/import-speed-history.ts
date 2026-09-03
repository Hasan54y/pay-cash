// One-off: backfill the payments table from Speed's transaction history after a
// fresh database (old DB/DB credentials were lost). Does NOT touch user balances —
// replaying payments without matching withdrawal history would double-count money
// already paid out. Run once via `npx tsx src/server/scripts/import-speed-history.ts`.
import { db, usersTable, paymentsTable } from "../db/index.js";
import { eq } from "drizzle-orm";

const SPEED_API = "https://api.tryspeed.com";
const SPEED_API_KEY = process.env.SPEED_API_KEY ?? "";

function speedAuth() {
  return `Basic ${Buffer.from(`${SPEED_API_KEY.trim()}:`).toString("base64")}`;
}

interface SpeedPayment {
  id: string;
  status: string;
  amount: number;
  target_amount: number;
  payment_request?: string;
  statement_descriptor?: string;
  created: number;
  modified: number;
}

function makeShortId(id: string) {
  return id.slice(0, 10).split("_").map((s) => s ? s[0].toUpperCase() + s.slice(1) : s).join("_");
}

async function fetchAllPayments(): Promise<SpeedPayment[]> {
  const all: SpeedPayment[] = [];
  let startingAfter: string | undefined;
  for (;;) {
    const url = new URL(`${SPEED_API}/payments`);
    url.searchParams.set("limit", "100");
    if (startingAfter) url.searchParams.set("starting_after", startingAfter);
    const r = await fetch(url, { headers: { Authorization: speedAuth(), "speed-version": "2022-04-15" } });
    const body = await r.json() as { data?: SpeedPayment[]; has_more?: boolean; errors?: unknown };
    if (!r.ok || !body.data) throw new Error(`Speed API error: ${JSON.stringify(body)}`);
    all.push(...body.data);
    if (!body.has_more || body.data.length === 0) break;
    startingAfter = body.data[body.data.length - 1].id;
  }
  return all;
}

function mapStatus(speedStatus: string): "paid" | "expired" | "pending" | null {
  if (speedStatus === "paid") return "paid";
  if (speedStatus === "expired") return "expired";
  return null; // unknown/unhandled status — skip rather than guess
}

async function main() {
  if (!SPEED_API_KEY) throw new Error("SPEED_API_KEY not set");

  const subadmins = await db.select({ id: usersTable.id, displayName: usersTable.displayName })
    .from(usersTable).where(eq(usersTable.role, "subadmin"));
  const byName = new Map(subadmins.map((u) => [u.displayName.trim().toLowerCase(), u.id]));

  console.log("Fetching full payment history from Speed...");
  const payments = await fetchAllPayments();
  console.log(`Fetched ${payments.length} payments from Speed.`);

  let imported = 0, skippedExisting = 0, skippedStatus = 0, matchedToSubadmin = 0, unmatched = 0;

  for (const p of payments) {
    const status = mapStatus(p.status);
    if (!status) { skippedStatus++; continue; }

    const [existing] = await db.select({ id: paymentsTable.id }).from(paymentsTable).where(eq(paymentsTable.id, p.id));
    if (existing) { skippedExisting++; continue; }

    const name = (p.statement_descriptor ?? "").replace(/^Pay\s+/i, "").trim().toLowerCase();
    const userId = byName.get(name) ?? null;
    if (userId) matchedToSubadmin++; else unmatched++;

    await db.insert(paymentsTable).values({
      id: p.id,
      shortId: makeShortId(p.id),
      userId,
      amountUsd: String(p.amount),
      chargedUsd: String(p.amount),
      amountSats: String(p.target_amount ?? 0),
      status,
      lightningInvoice: p.payment_request ?? "",
      createdAt: new Date(p.created),
      paidAt: status === "paid" ? new Date(p.modified) : null,
    });
    imported++;
  }

  console.log("Done.");
  console.log({ totalFetched: payments.length, imported, skippedExisting, skippedStatus, matchedToSubadmin, unmatched });
  console.log("NOTE: user balances were NOT modified. Set correct current balances manually via the admin Users tab.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
