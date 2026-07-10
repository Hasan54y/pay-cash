import express from "express";
import cors from "cors";
import path from "path";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { db, usersTable, paymentsTable, withdrawalsTable, settingsTable, pushSubscriptionsTable } from "./db/index.js";
import { eq, desc, sql, and, lt, ne } from "drizzle-orm";

const app = express();
app.use(cors());
app.use(express.json());

const SPEED_API = "https://api.tryspeed.com";
const SPEED_API_KEY = process.env.SPEED_API_KEY ?? "";
const sseClients = new Map<string, express.Response>();

function speedAuth() {
  return `Basic ${Buffer.from(`${SPEED_API_KEY.trim()}:`).toString("base64")}`;
}

function makeShortId(id: string) {
  return id.slice(0, 10).split("_").map((s) => s ? s[0].toUpperCase() + s.slice(1) : s).join("_");
}

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select({ value: settingsTable.value }).from(settingsTable).where(eq(settingsTable.key, key));
  return row?.value ?? null;
}

async function setSetting(key: string, value: string) {
  await db.insert(settingsTable).values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
}

async function verifyAdmin(password: string): Promise<boolean> {
  const hash = await getSetting("admin_password_hash");
  if (hash) return bcrypt.compare(password, hash);
  const envPw = process.env.ADMIN_PASSWORD;
  if (!envPw) return false;
  return password === envPw;
}

function adminAuth(req: express.Request): string | undefined {
  return req.headers["x-admin-password"] as string | undefined;
}

async function getUserFromToken(token: string): Promise<typeof usersTable.$inferSelect | null> {
  const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, token), eq(usersTable.status, "active")));
  return user ?? null;
}

// Send push notification
async function sendPushNotification(userId: string | null, title: string, body: string) {
  try {
    const webpush = await import("web-push");
    const vapidPublic = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) return;

    webpush.default.setVapidDetails("mailto:admin@pay-cash.shop", vapidPublic, vapidPrivate);

    const query = userId
      ? db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId))
      : db.select().from(pushSubscriptionsTable);

    const subs = await query;
    for (const sub of subs) {
      try {
        await webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title, body, icon: "/cashapp-logo.png" })
        );
      } catch { /**/ }
    }
  } catch { /**/ }
}

// ── OG Image ──
app.get("/og-image.svg", async (_req, res) => {
  const displayName = (await getSetting("display_name")) ?? "Pay Cash";
  const initial = displayName.trim()[0]?.toUpperCase() ?? "P";
  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#00D632"/>
  <circle cx="148" cy="10" r="210" fill="#FF4444"/>
  <text x="148" y="165" font-family="Arial,sans-serif" font-size="180" font-weight="900" fill="white" text-anchor="middle">${initial}</text>
  <rect x="1010" y="-50" width="260" height="260" rx="56" fill="#111"/>
  <text x="1140" y="168" font-family="Arial,sans-serif" font-size="160" font-weight="800" fill="none" stroke="#00D632" stroke-width="4" text-anchor="middle">$</text>
  <text x="52" y="570" font-family="Arial,sans-serif" font-size="108" font-weight="900" fill="#000" letter-spacing="-3">${displayName}</text>
</svg>`;
  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader("Cache-Control", "no-cache");
  res.send(svg);
});

// ── Push Notifications ──
app.get("/api/vapid-public-key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? "" });
});

app.post("/api/push/subscribe", async (req, res) => {
  const { subscription, userId } = req.body as { subscription: { endpoint: string; keys: { p256dh: string; auth: string } }; userId?: string };
  if (!subscription?.endpoint) { res.status(400).json({ error: "Invalid subscription" }); return; }
  await db.insert(pushSubscriptionsTable).values({
    id: nanoid(), userId: userId ?? null,
    endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth,
  }).onConflictDoNothing();
  res.json({ success: true });
});

// ── Auth ──
app.post("/api/auth/signup", async (req, res) => {
  const { fullName, email, phone, displayName, username, password } = req.body as Record<string, string>;
  if (!fullName || !email || !username || !password || !displayName) {
    res.status(400).json({ error: "All fields required" }); return;
  }
  const existing = await db.select({ id: usersTable.id }).from(usersTable)
    .where(eq(usersTable.username, username.toLowerCase()));
  if (existing.length) { res.status(400).json({ error: "Username already taken" }); return; }
  const existingEmail = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existingEmail.length) { res.status(400).json({ error: "Email already registered" }); return; }

  await db.insert(usersTable).values({
    id: nanoid(), fullName, email, phone: phone ?? "",
    displayName, username: username.toLowerCase().replace(/[^a-z0-9_-]/g, ""),
    passwordHash: await bcrypt.hash(password, 10),
    role: "subadmin", status: "pending", bdtRate: "120", balance: "0",
  });
  // Notify admin of new signup
  await sendPushNotification(null, "New Signup Request", `${fullName} wants to join Pay Cash`);
  res.status(201).json({ message: "Signup request submitted. Wait for admin approval." });
});

app.post("/api/auth/login", async (req, res) => {
  const { usernameOrEmail, password } = req.body as { usernameOrEmail: string; password: string };
  if (!usernameOrEmail || !password) { res.status(400).json({ error: "All fields required" }); return; }

  const [user] = await db.select().from(usersTable).where(
    eq(usersTable.email, usernameOrEmail)
  );
  const [userByUsername] = !user ? await db.select().from(usersTable).where(eq(usersTable.username, usernameOrEmail)) : [null];
  const found = user ?? userByUsername;

  if (!found) { res.status(401).json({ error: "Invalid credentials" }); return; }
  if (found.status === "pending") { res.status(403).json({ error: "Account pending approval" }); return; }
  if (found.status === "rejected") { res.status(403).json({ error: "Account rejected" }); return; }
  if (found.status === "suspended") { res.status(403).json({ error: "Account suspended" }); return; }
  if (!await bcrypt.compare(password, found.passwordHash)) { res.status(401).json({ error: "Invalid credentials" }); return; }

  res.json({ token: found.id, role: found.role, displayName: found.displayName, username: found.username });
});

// ── Public Payment Page ──
app.get("/api/pay/:username", async (req, res) => {
  const [user] = await db.select({
    displayName: usersTable.displayName, username: usersTable.username, id: usersTable.id
  }).from(usersTable).where(and(eq(usersTable.username, req.params.username), eq(usersTable.status, "active")));
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ displayName: user.displayName, username: user.username });
});

// Also keep /api/public for main admin page
app.get("/api/public", async (_req, res) => {
  const displayName = (await getSetting("display_name")) ?? "";
  const username = (await getSetting("admin_username")) ?? "";
  res.json({ displayName, username });
});

app.post("/api/invoices", async (req, res) => {
  const { amount_usd, userId } = req.body as { amount_usd?: number; userId?: string };
  if (!amount_usd || amount_usd < 10 || amount_usd > 9999) {
    res.status(400).json({ error: "Amount must be between $10 and $9,999" }); return;
  }

  let displayName = (await getSetting("display_name")) ?? "Pay Cash";
  let feePercentage = parseFloat((await getSetting("fee_percentage")) ?? "0");

  if (userId) {
    const [user] = await db.select().from(usersTable).where(and(eq(usersTable.id, userId), eq(usersTable.status, "active")));
    if (user) displayName = user.displayName;
  }

  const charged = feePercentage > 0 ? Math.round(amount_usd * (1 + feePercentage / 100) * 100) / 100 : amount_usd;

  const r = await fetch(`${SPEED_API}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: speedAuth(), "speed-version": "2022-04-15" },
    body: JSON.stringify({ currency: "USD", amount: charged, target_currency: "SATS", payment_methods: ["lightning"], ttl: 600, statement_descriptor: `Pay ${displayName}` }),
  });

  const payment = await r.json() as { id?: string; payment_request?: string; amount?: number; target_amount?: number; errors?: unknown };
  if (!r.ok || !payment.id) { res.status(500).json({ error: "Failed to create invoice", details: payment }); return; }

  const shortId = makeShortId(payment.id);
  await db.insert(paymentsTable).values({
    id: payment.id, shortId, userId: userId ?? null,
    amountUsd: String(amount_usd), chargedUsd: String(charged),
    status: "pending", lightningInvoice: payment.payment_request ?? "",
    amountSats: String(payment.target_amount ?? payment.amount ?? 0),
  });

  res.status(201).json({
    invoiceId: payment.id, shortId, lightningInvoice: payment.payment_request ?? "",
    amountSats: payment.target_amount ?? payment.amount ?? 0, amountUsd: amount_usd,
  });
});

app.get("/api/payment-status/:id", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  const [row] = await db.select({ status: paymentsTable.status }).from(paymentsTable).where(eq(paymentsTable.id, req.params.id));
  if (row?.status === "paid") { res.write(`data: ${JSON.stringify({ status: "paid" })}\n\n`); res.end(); return; }
  sseClients.set(req.params.id, res);
  req.on("close", () => sseClients.delete(req.params.id));
  const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch { clearInterval(ping); } }, 25000);
  req.on("close", () => clearInterval(ping));
});

app.post("/api/webhook/speed", async (req, res) => {
  const event = (req.body ?? {}) as Record<string, unknown>;
  const eventType = ((event.type ?? event.event ?? "") as string).toLowerCase();
  const dataRaw = (event.data ?? {}) as Record<string, unknown>;
  const data = ((dataRaw.object as Record<string, unknown>) ?? dataRaw) as Record<string, unknown>;
  const paymentId = (data.id ?? data.payment_id ?? event.id) as string | undefined;
  const dataStatus = ((data.status as string) ?? "").toLowerCase();
  const isPaid = ["payment.paid","payment.confirmed","payment.completed","invoice.paid"].includes(eventType) || ["paid","confirmed","completed"].includes(dataStatus);

  if (isPaid && paymentId) {
    const result = await db.update(paymentsTable).set({ status: "paid", paidAt: new Date() })
      .where(eq(paymentsTable.id, paymentId)).returning();
    if (result.length > 0) {
      const p = result[0];
      const amount = parseFloat(String(p.amountUsd));

      // Credit sub-admin balance
      if (p.userId) {
        await db.update(usersTable).set({
          balance: sql`${usersTable.balance}::numeric + ${amount}`
        }).where(eq(usersTable.id, p.userId));
        const [user] = await db.select({ displayName: usersTable.displayName }).from(usersTable).where(eq(usersTable.id, p.userId));
        await sendPushNotification(p.userId, "Payment Received!", `$${amount.toFixed(2)} received on your page`);
        await sendPushNotification(null, `Payment - ${user?.displayName ?? ""}`, `$${amount.toFixed(2)} received`);
      } else {
        const displayName = (await getSetting("display_name")) ?? "";
        await sendPushNotification(null, `Payment Received!`, `$${amount.toFixed(2)} received - ${displayName}`);
      }

      const client = sseClients.get(paymentId);
      if (client) {
        client.write(`data: ${JSON.stringify({ status: "paid", amountUsd: amount, shortId: p.shortId, lightningInvoice: p.lightningInvoice })}\n\n`);
        sseClients.delete(paymentId);
      }
    }
  }
  res.sendStatus(200);
});

// ── Sub-admin API ──
app.get("/api/dashboard/me", async (req, res) => {
  const token = req.headers["x-user-token"] as string;
  const user = await getUserFromToken(token);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json({
    id: user.id, fullName: user.fullName, displayName: user.displayName,
    username: user.username, email: user.email, phone: user.phone,
    balance: parseFloat(String(user.balance)),
    bdtRate: parseFloat(String(user.bdtRate ?? 120)),
  });
});

app.get("/api/dashboard/payments", async (req, res) => {
  const token = req.headers["x-user-token"] as string;
  const user = await getUserFromToken(token);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  await db.update(paymentsTable).set({ status: "expired" })
    .where(and(eq(paymentsTable.status, "pending"), lt(paymentsTable.createdAt, tenMinsAgo), eq(paymentsTable.userId, user.id)));

  const rows = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.userId, user.id))
    .orderBy(desc(paymentsTable.createdAt)).limit(10);

  res.json(rows.map((r) => ({
    ...r, amountUsd: parseFloat(String(r.amountUsd)),
    amountSats: parseInt(String(r.amountSats)),
    createdAt: r.createdAt.toISOString(), paidAt: r.paidAt?.toISOString() ?? null,
  })));
});

app.post("/api/dashboard/withdraw", async (req, res) => {
  const token = req.headers["x-user-token"] as string;
  const user = await getUserFromToken(token);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { amountUsd, method, accountNumber, accountName, bankName, routingNumber, district, upazila } = req.body as Record<string, string>;
  const amount = parseFloat(amountUsd);
  const balance = parseFloat(String(user.balance));

  if (!amount || amount < 10) { res.status(400).json({ error: "Minimum withdrawal is $10" }); return; }
  if (amount > balance) { res.status(400).json({ error: "Insufficient balance" }); return; }
  if (method === "bank" && amount < 250) { res.status(400).json({ error: "Bank withdrawal requires minimum $250" }); return; }

  await db.insert(withdrawalsTable).values({
    id: nanoid(), userId: user.id, amountUsd: String(amount), method: method as "bkash" | "nagad" | "bank",
    accountNumber, accountName, bankName, routingNumber, district, upazila, status: "pending",
  });

  // Notify admin
  await sendPushNotification(null, "Withdrawal Request", `${user.displayName} requested $${amount.toFixed(2)} via ${method}`);

  res.status(201).json({ message: "Withdrawal request submitted" });
});

app.get("/api/dashboard/withdrawals", async (req, res) => {
  const token = req.headers["x-user-token"] as string;
  const user = await getUserFromToken(token);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.userId, user.id))
    .orderBy(desc(withdrawalsTable.createdAt)).limit(20);
  res.json(rows.map((r) => ({ ...r, amountUsd: parseFloat(String(r.amountUsd)), createdAt: r.createdAt.toISOString() })));
});

app.put("/api/dashboard/settings", async (req, res) => {
  const token = req.headers["x-user-token"] as string;
  const user = await getUserFromToken(token);
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { displayName, username, newPassword, currentPassword } = req.body as Record<string, string>;
  if (!await bcrypt.compare(currentPassword, user.passwordHash)) {
    res.status(401).json({ error: "Current password incorrect" }); return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (displayName?.trim()) updates.displayName = displayName.trim();
  if (username?.trim()) {
    const slug = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    const existing = await db.select({ id: usersTable.id }).from(usersTable)
      .where(and(eq(usersTable.username, slug), ne(usersTable.id, user.id)));
    if (existing.length) { res.status(400).json({ error: "Username taken" }); return; }
    updates.username = slug;
  }
  if (newPassword && newPassword.length >= 6) updates.passwordHash = await bcrypt.hash(newPassword, 10);
  if (Object.keys(updates).length) await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

// ── Admin API ──
app.post("/api/admin/verify", async (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: "password required" }); return; }
  res.json({ valid: await verifyAdmin(password) });
});

app.get("/api/admin/settings", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  res.json({
    displayName: (await getSetting("display_name")) ?? "",
    username: (await getSetting("admin_username")) ?? "",
    feePercentage: parseFloat((await getSetting("fee_percentage")) ?? "0"),
    email: (await getSetting("recovery_email")) ?? "",
  });
});

app.put("/api/admin/settings", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { displayName, username, newPassword, feePercentage, email, currentPassword } = req.body as Record<string, string>;
  if (!await verifyAdmin(currentPassword)) { res.status(401).json({ error: "Wrong password" }); return; }
  if (displayName !== undefined) await setSetting("display_name", displayName.trim());
  if (username !== undefined) await setSetting("admin_username", username.trim().toLowerCase());
  if (newPassword && newPassword.length >= 6) await setSetting("admin_password_hash", await bcrypt.hash(newPassword, 10));
  if (feePercentage !== undefined) await setSetting("fee_percentage", feePercentage);
  if (email !== undefined) await setSetting("recovery_email", email);
  res.json({ success: true });
});

app.get("/api/admin/payments", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }

  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
  await db.update(paymentsTable).set({ status: "expired" })
    .where(and(eq(paymentsTable.status, "pending"), lt(paymentsTable.createdAt, tenMinsAgo)));

  const rows = await db.select({
    payment: paymentsTable, user: { displayName: usersTable.displayName, username: usersTable.username }
  }).from(paymentsTable).leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .orderBy(desc(paymentsTable.createdAt)).limit(500);

  const [totalRow] = await db.select({ total: sql<string>`coalesce(sum(${paymentsTable.amountUsd}::numeric),0)` })
    .from(paymentsTable).where(eq(paymentsTable.status, "paid"));

  res.json({
    payments: rows.map(({ payment: p, user: u }) => ({
      ...p, amountUsd: parseFloat(String(p.amountUsd)),
      amountSats: parseInt(String(p.amountSats)),
      createdAt: p.createdAt.toISOString(), paidAt: p.paidAt?.toISOString() ?? null,
      subadminName: u?.displayName ?? null, subadminUsername: u?.username ?? null,
    })),
    totalRevenue: parseFloat(String(totalRow?.total ?? "0")),
  });
});

app.put("/api/admin/payments/:id/check", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { checked } = req.body as { checked: boolean };
  await db.update(paymentsTable).set({ checkedBy: checked ? "admin" : null }).where(eq(paymentsTable.id, req.params.id));
  res.json({ success: true });
});

app.get("/api/admin/users", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const users = await db.select().from(usersTable).where(eq(usersTable.role, "subadmin"))
    .orderBy(desc(usersTable.createdAt));
  res.json(users.map((u) => ({ ...u, balance: parseFloat(String(u.balance)), bdtRate: parseFloat(String(u.bdtRate ?? 120)) })));
});

app.put("/api/admin/users/:id", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { status, bdtRate, newPassword, clearBalance } = req.body as Record<string, string>;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (status) updates.status = status as "active" | "pending" | "rejected" | "suspended";
  if (bdtRate) updates.bdtRate = bdtRate;
  if (newPassword && newPassword.length >= 6) updates.passwordHash = await bcrypt.hash(newPassword, 10);
  if (clearBalance === "true") updates.balance = "0";
  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.params.id));
  res.json({ success: true });
});

app.get("/api/admin/withdrawals", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select({
    withdrawal: withdrawalsTable, user: { displayName: usersTable.displayName, username: usersTable.username }
  }).from(withdrawalsTable).leftJoin(usersTable, eq(withdrawalsTable.userId, usersTable.id))
    .orderBy(desc(withdrawalsTable.createdAt));
  res.json(rows.map(({ withdrawal: w, user: u }) => ({
    ...w, amountUsd: parseFloat(String(w.amountUsd)),
    createdAt: w.createdAt.toISOString(), paidAt: w.paidAt?.toISOString() ?? null,
    userName: u?.displayName ?? "", userUsername: u?.username ?? "",
  })));
});

app.put("/api/admin/withdrawals/:id", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { status, note } = req.body as { status: string; note?: string };
  const [withdrawal] = await db.select().from(withdrawalsTable).where(eq(withdrawalsTable.id, req.params.id));
  if (!withdrawal) { res.status(404).json({ error: "Not found" }); return; }

  await db.update(withdrawalsTable).set({
    status: status as "paid" | "rejected" | "pending",
    note: note ?? null, paidAt: status === "paid" ? new Date() : null,
  }).where(eq(withdrawalsTable.id, req.params.id));

  // Deduct balance when paid
  if (status === "paid") {
    await db.update(usersTable).set({
      balance: sql`greatest(0, ${usersTable.balance}::numeric - ${withdrawal.amountUsd}::numeric)`
    }).where(eq(usersTable.id, withdrawal.userId));
    await sendPushNotification(withdrawal.userId, "Withdrawal Paid!", `Your withdrawal of $${parseFloat(String(withdrawal.amountUsd)).toFixed(2)} has been processed`);
  } else if (status === "rejected") {
    await sendPushNotification(withdrawal.userId, "Withdrawal Rejected", note ?? "Your withdrawal request was rejected");
  }

  res.json({ success: true });
});

app.get("/api/admin/speed-balance", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const r = await fetch(`${SPEED_API}/balances`, { headers: { Authorization: speedAuth(), "speed-version": "2022-04-15" } });
    const data = await r.json() as { available?: { amount: number; target_currency: string }[] };
    let balanceSats = 0;
    for (const item of data.available ?? []) {
      const cur = (item.target_currency ?? "").toUpperCase();
      if (cur === "SATS" || cur === "SAT") balanceSats += item.amount;
      else if (cur === "BTC") balanceSats += item.amount * 100000000;
    }
    let balanceUsd = 0;
    if (balanceSats > 0) {
      try {
        const pr = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
        const pd = await pr.json() as { bitcoin?: { usd?: number } };
        balanceUsd = Math.round((balanceSats / 100000000) * (pd.bitcoin?.usd ?? 100000) * 100) / 100;
      } catch { /**/ }
    }
    res.json({ balanceUsd, balanceSats });
  } catch { res.status(500).json({ error: "Failed", balanceUsd: 0 }); }
});

app.post("/api/admin/sync", async (req, res) => {
  const pw = adminAuth(req);
  if (!pw || !await verifyAdmin(pw)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const pending = await db.select().from(paymentsTable).where(eq(paymentsTable.status, "pending")).limit(50);
  let updated = 0;
  for (const row of pending) {
    try {
      const r = await fetch(`${SPEED_API}/payments/${row.id}`, { headers: { Authorization: speedAuth(), "speed-version": "2022-04-15" } });
      if (!r.ok) continue;
      const p = await r.json() as { status?: string };
      if (["paid","completed","confirmed"].includes((p.status ?? "").toLowerCase())) {
        await db.update(paymentsTable).set({ status: "paid", paidAt: new Date() }).where(eq(paymentsTable.id, row.id));
        if (row.userId) {
          await db.update(usersTable).set({ balance: sql`${usersTable.balance}::numeric + ${row.amountUsd}` }).where(eq(usersTable.id, row.userId));
        }
        const client = sseClients.get(row.id);
        if (client) { client.write(`data: ${JSON.stringify({ status: "paid" })}\n\n`); sseClients.delete(row.id); }
        updated++;
      }
    } catch { /**/ }
  }
  res.json({ checked: pending.length, updated });
});

// ── Frontend ──
if (process.env.NODE_ENV === "production") {
  const publicDir = path.join(process.cwd(), "dist/public");
  app.use(express.static(publicDir));
  app.get("/{*path}", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
}

const PORT = parseInt(process.env.PORT ?? "5000");
app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
