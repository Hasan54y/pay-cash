import { registerPush } from "./../push";
import QRCanvas from "./../QRCanvas";
import { downloadQRCard } from "./../qrRenderer";
import { useState, useEffect, useRef } from "react";

// Vector Icons
function IcoHome({ on }: { on: boolean }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function IcoCard({ on }: { on: boolean }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
function IcoUsers({ on }: { on: boolean }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>; }
function IcoMoney({ on }: { on: boolean }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
function IcoSettings({ on }: { on: boolean }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }


type Tab = "home" | "payments" | "users" | "withdrawals" | "settings";

interface Payment { id: string; shortId: string; amountUsd: number; amountSats: number; status: string; createdAt: string; paidAt: string | null; checkedBy: string | null; lightningInvoice: string; subadminName: string | null; subadminUsername: string | null; }
interface AdminData { payments: Payment[]; totalRevenue: number; }
interface User { id: string; fullName: string; displayName: string; username: string; email: string; phone: string; balance: number; bdtRate: number; status: string; createdAt: string; }
interface Withdrawal { id: string; userId: string; amountUsd: number; method: string; accountNumber: string | null; accountName: string | null; bankName: string | null; routingNumber: string | null; district: string | null; upazila: string | null; status: string; createdAt: string; paidAt: string | null; userName: string; userUsername: string; note: string | null; }


function playSound() {
  try {
    const ctx = new AudioContext(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, ctx.currentTime); o.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch { /**/ }
}

export default function AdminPage() {
  const [pw, setPw] = useState(() => localStorage.getItem("admin_pw") ?? "");
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("admin_pw"));
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState<Tab>("home");

  useEffect(() => { if (authed) registerPush(null); }, [authed]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    const d = await r.json() as { valid: boolean };
    if (d.valid) { setAuthed(true); localStorage.setItem("admin_pw", pw); registerPush(null); } else setAuthError("Incorrect password");
  }

  if (!authed) return (
    <div style={{ background: "#f5f5f7", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "36px 28px", width: "100%", maxWidth: 360, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <img src="/cashapp-logo.png" width={60} height={60} alt="" style={{ borderRadius: 14, margin: "0 auto 16px", display: "block" }} />
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 4 }}>Pay Cash</h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>Admin Dashboard</p>
        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Admin password" required
            style={{ background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 15, padding: "14px 16px", outline: "none", textAlign: "center" }} />
          {authError && <p style={{ color: "#ff3b30", fontSize: 13 }}>{authError}</p>}
          <button type="submit" style={{ background: "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: "pointer" }}>Sign In</button>
        </form>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100dvh", fontFamily: "-apple-system, sans-serif", paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>
        {tab === "home" && <HomeTab pw={pw} />}
        {tab === "payments" && <PaymentsTab pw={pw} />}
        {tab === "users" && <UsersTab pw={pw} />}
        {tab === "withdrawals" && <WithdrawalsTab pw={pw} />}
        {tab === "settings" && <SettingsTab pw={pw} onLogout={() => { localStorage.removeItem("admin_pw"); setAuthed(false); setPw(""); }} />}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid #e5e5ea", display: "flex", zIndex: 100 }}>
        {([
          ["home","Home",<IcoHome on={tab==="home"} />],
          ["payments","Payments",<IcoCard on={tab==="payments"} />],
          ["users","Users",<IcoUsers on={tab==="users"} />],
          ["withdrawals","Withdraw",<IcoMoney on={tab==="withdrawals"} />],
          ["settings","Settings",<IcoSettings on={tab==="settings"} />],
        ] as [Tab,string,React.ReactNode][]).map(([t,label,icon]) => (
          <button key={String(t)} onClick={() => setTab(t as Tab)}
            style={{ flex: 1, background: "transparent", border: "none", padding: "8px 0 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {icon}
            <span style={{ fontSize: 10, fontWeight: 600, color: tab === t ? "#00C853" : "#8e8e93" }}>{String(label)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function HomeTab({ pw }: { pw: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [copied, setCopied] = useState(false);
  const prevPaidCount = useRef(0);
  const payLink = adminUsername ? `https://pay-cash.shop/pay/${adminUsername}` : `https://pay-cash.shop`;

  async function fetchData() {
    const r = await fetch("/api/admin/payments", { headers: { "x-admin-password": pw } });
    if (!r.ok) return;
    const d: AdminData = await r.json(); setData(d);
    const paidNow = d.payments.filter(p => p.status === "paid").length;
    if (prevPaidCount.current > 0 && paidNow > prevPaidCount.current) {
      const newest = d.payments.find(p => p.status === "paid");
      if (newest) { playSound(); if ("Notification" in window && Notification.permission === "granted") new Notification("Payment Received!", { body: `$${newest.amountUsd.toFixed(2)} received`, icon: "/cashapp-logo.png" }); }
    }
    prevPaidCount.current = paidNow;
  }

  useEffect(() => {
    fetch("/api/public").then(r => r.json()).then((d: { displayName?: string; username?: string }) => {
      setDisplayName(d.displayName ?? "");
      setAdminUsername(d.username ?? "");
    });
    fetchData();
    fetch("/api/admin/speed-balance", { headers: { "x-admin-password": pw } }).then(r => r.json()).then((d: { balanceUsd?: number }) => setWalletBalance(d.balanceUsd ?? 0)).catch(() => {});
    const iv = setInterval(fetchData, 30000);
    return () => clearInterval(iv);
  }, []);

  const payments = data?.payments ?? [];
  const paid = payments.filter(p => p.status === "paid");
  const totalRevenue = data?.totalRevenue ?? 0;
  const todayPaid = paid.filter(p => p.paidAt && new Date(p.paidAt).toDateString() === new Date().toDateString());
  const todayTotal = todayPaid.reduce((s, p) => s + p.amountUsd, 0);
  const last10 = payments.filter(p => !(p.status === "expired" && Date.now() - new Date(p.createdAt).getTime() > 600000)).slice(0, 10);

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={{ background: "#1c2333", padding: "52px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/cashapp-logo.png" width={36} height={36} style={{ borderRadius: 9 }} alt="" />
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>Pay {displayName}</span>
          </div>
          <span style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.4)", borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 600, color: "#00C853", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, background: "#00C853", borderRadius: "50%", display: "inline-block" }} />Live
          </span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", margin: "0 0 6px" }}>Present Balance</p>
              <p style={{ fontSize: 24, fontWeight: 900, margin: "0 0 2px", color: "#00C853" }}>${walletBalance != null ? walletBalance.toFixed(2) : "…"}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>Speed Wallet</p>
            </div>
            <div style={{ paddingLeft: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", margin: "0 0 6px" }}>Total Revenue</p>
              <p style={{ fontSize: 24, fontWeight: 900, margin: "0 0 2px", color: "#fff" }}>${totalRevenue.toFixed(2)}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: 0 }}>{paid.length} payments</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Today</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 2px" }}>${todayTotal.toFixed(2)}</p>
            <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{todayPaid.length} paid</p>
          </div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>All Time</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 2px" }}>{paid.length}</p>
            <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>payments</p>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
          <p style={{ fontSize: 13, color: "#8e8e93", textAlign: "center", margin: "0 0 12px" }}>Scan to pay with cash app</p>
          <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
            <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 8, flexShrink: 0 }}>
              <QRCanvas data={payLink} size={120} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
              <p style={{ fontSize: 11, color: "#888", margin: 0, wordBreak: "break-all" }}>
                {adminUsername ? `pay-cash.shop/pay/${adminUsername}` : "Set username in Settings"}
              </p>
              <button onClick={() => { navigator.clipboard.writeText(payLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                style={{ background: "#111", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <button onClick={() => downloadQRCard(payLink, displayName)}
                style={{ background: "#f5f5f7", border: "none", borderRadius: 10, color: "#111", fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download QR
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>Recent Transactions</p>
          {last10.length === 0 ? <p style={{ color: "#8e8e93", textAlign: "center", padding: "16px 0" }}>No transactions yet</p>
            : last10.map(p => <PaymentRowSimple key={p.id} p={p} />)}
        </div>
      </div>
    </div>
  );
}

function PaymentRowSimple({ p }: { p: Payment }) {
  const sc: Record<string, string> = { paid: "#00C853", pending: "#ff9500", expired: "rgba(0,0,0,0.4)" };
  const sb: Record<string, string> = { paid: "#e8faf0", pending: "#fff9f0", expired: "rgba(0,0,0,0.06)" };
  const sl: Record<string, string> = { paid: "Completed", pending: "Pending", expired: "Expired" };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f7" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: sb[p.status] ?? "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          {p.status === "paid" ? "✓" : p.status === "expired" ? "✕" : "⏳"}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>${p.amountUsd.toFixed(2)} {p.subadminName && <span style={{ fontSize: 11, color: "#8e8e93", fontWeight: 400 }}>· {p.subadminName}</span>}</p>
          <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{new Date(p.paidAt ?? p.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: sc[p.status], background: sb[p.status], borderRadius: 20, padding: "3px 10px" }}>{sl[p.status] ?? p.status}</span>
    </div>
  );
}

function PaymentsTab({ pw }: { pw: string }) {
  const [data, setData] = useState<AdminData | null>(null);
  const [filter, setFilter] = useState<"all"|"paid"|"pending"|"expired">("all");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [checked, setChecked] = useState<Set<string>>(() => { try { return new Set(JSON.parse(localStorage.getItem("checked_payments") ?? "[]")); } catch { return new Set(); } });

  function toggleCheck(id: string) {
    setChecked(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); localStorage.setItem("checked_payments", JSON.stringify([...next])); return next; });
    fetch(`/api/admin/payments/${id}/check`, { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ checked: !checked.has(id) }) }).catch(() => {});
  }

  useEffect(() => { fetch("/api/admin/payments", { headers: { "x-admin-password": pw } }).then(r => r.json()).then(setData); }, []);

  async function sync() {
    setSyncing(true); setSyncMsg("");
    const r = await fetch("/api/admin/sync", { method: "POST", headers: { "x-admin-password": pw } });
    const d = await r.json() as { checked: number; updated: number };
    setSyncing(false); setSyncMsg(`Updated ${d.updated} of ${d.checked}`);
    fetch("/api/admin/payments", { headers: { "x-admin-password": pw } }).then(r => r.json()).then(setData);
  }

  const now = Date.now(); const tenMins = 600000;
  const all = data?.payments ?? [];
  const filtered = all.filter(p => {
    if (filter === "all") return p.status !== "expired" && !(p.status === "pending" && now - new Date(p.createdAt).getTime() > tenMins);
    return p.status === filter;
  });
  const counts = { all: all.filter(p => p.status !== "expired").length, paid: all.filter(p => p.status === "paid").length, pending: all.filter(p => p.status === "pending").length, expired: all.filter(p => p.status === "expired").length };

  // Group by date
  function dateLabel(d: string) {
    const dt = new Date(d); const t = new Date(); const y = new Date(t); y.setDate(t.getDate() - 1);
    if (dt.toDateString() === t.toDateString()) return "Today";
    if (dt.toDateString() === y.toDateString()) return "Yesterday";
    return dt.toLocaleDateString("en-US", { day: "numeric", month: "long" });
  }
  const grouped: { label: string; items: Payment[] }[] = [];
  for (const p of filtered) {
    const label = dateLabel(p.paidAt ?? p.createdAt);
    const ex = grouped.find(g => g.label === label);
    if (ex) ex.items.push(p); else grouped.push({ label, items: [p] });
  }

  const sc: Record<string, string> = { paid: "#00C853", pending: "#ff9500", expired: "rgba(0,0,0,0.4)" };
  const sb: Record<string, string> = { paid: "#e8faf0", pending: "#fff9f0", expired: "rgba(0,0,0,0.06)" };
  const sl: Record<string, string> = { paid: "Completed", pending: "Pending", expired: "Expired" };

  return (
    <div>
      <div style={{ background: "#fff", padding: "52px 20px 14px", borderBottom: "1px solid #f0f0f0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>Payments</h1>
          <button onClick={sync} disabled={syncing} style={{ background: "#f5f5f7", border: "none", borderRadius: 20, color: syncing ? "#8e8e93" : "#111", fontSize: 13, fontWeight: 600, padding: "8px 14px", cursor: syncing ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            {syncing ? "Syncing…" : "Sync"}
          </button>
        </div>
        {syncMsg && <p style={{ color: "#00C853", fontSize: 12, margin: "6px 0 0", fontWeight: 600 }}>{syncMsg}</p>}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" }}>
        {(["all","paid","pending","expired"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? "#111" : "#fff", border: "none", borderRadius: 20, color: filter === f ? "#fff" : "#8e8e93", fontSize: 13, fontWeight: 600, padding: "8px 16px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: filter === f ? "none" : "0 1px 4px rgba(0,0,0,0.08)" }}>
            {f === "paid" ? "Completed" : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>
      <div style={{ padding: "0 16px" }}>
        {grouped.length === 0 ? <div style={{ background: "#fff", borderRadius: 20, padding: 32, textAlign: "center" }}><p style={{ color: "#8e8e93" }}>No payments</p></div>
          : grouped.map(({ label, items }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#8e8e93", margin: "0 0 8px 4px" }}>{label}</p>
              <div style={{ background: "#fff", borderRadius: 20, padding: "4px 16px" }}>
                {items.map(p => (
                  <PaymentRowAdmin key={p.id} p={p} isChecked={checked.has(p.id)} onToggle={() => toggleCheck(p.id)} sc={sc} sb={sb} sl={sl} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function PaymentRowAdmin({ p, isChecked, onToggle, sc, sb, sl }: { p: Payment; isChecked: boolean; onToggle: () => void; sc: Record<string,string>; sb: Record<string,string>; sl: Record<string,string>; }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f5f5f7", gap: 10 }}>
        <button onClick={onToggle} style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${isChecked ? "#00C853" : "#d1d1d6"}`, background: isChecked ? "#00C853" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>
          {isChecked && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div onClick={() => setOpen(v => !v)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 2px", opacity: isChecked ? 0.4 : 1 }}>
              ${p.amountUsd.toFixed(2)}
              {p.subadminName && <span style={{ fontSize: 11, color: "#8e8e93", fontWeight: 400, marginLeft: 6 }}>· {p.subadminName}</span>}
            </p>
            <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{new Date(p.paidAt ?? p.createdAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: sc[p.status] ?? "#888", background: sb[p.status] ?? "#f5f5f7", borderRadius: 20, padding: "3px 10px" }}>{sl[p.status] ?? p.status}</span>
            <span style={{ color: "#c7c7cc", fontSize: 16 }}>{open ? "▾" : "›"}</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ background: "#f9f9f9", borderRadius: 12, padding: "12px 14px", margin: "4px 0 8px" }}>
          {[["Transaction ID", p.shortId, true], ["Amount (sats)", p.amountSats.toLocaleString(), false], ["Status", sl[p.status] ?? p.status, false], ...(p.subadminName ? [["Sub-admin", p.subadminName, false]] : []), ["Created", new Date(p.createdAt).toLocaleString(), false], ...(p.paidAt ? [["Paid at", new Date(p.paidAt).toLocaleString(), false]] : [])].map(([l, v, m]) => (
            <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 12, color: "#8e8e93", margin: 0, fontWeight: 600 }}>{String(l)}</p>
              <p style={{ fontSize: 12, color: "#111", margin: 0, fontFamily: m ? "monospace" : "inherit", textAlign: "right", maxWidth: "60%" }}>{String(v)}</p>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, color: "#8e8e93", margin: "0 0 4px", fontWeight: 600 }}>Invoice</p>
            <p style={{ fontSize: 11, color: "#555", fontFamily: "monospace", wordBreak: "break-all", margin: "0 0 8px" }}>{p.lightningInvoice.slice(0, 40)}...</p>
            <button onClick={() => navigator.clipboard.writeText(p.lightningInvoice)}
              style={{ background: "#fff", border: "1px solid #e5e5ea", borderRadius: 8, color: "#111", fontSize: 12, fontWeight: 600, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Copy Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersTab({ pw }: { pw: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [editing, setEditing] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ bdtRate: "", newPassword: "", status: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => { fetchUsers(); }, []);
  async function fetchUsers() {
    const r = await fetch("/api/admin/users", { headers: { "x-admin-password": pw } });
    if (r.ok) setUsers(await r.json());
  }

  async function updateUser(id: string, updates: Record<string, string>) {
    setSaving(true);
    const r = await fetch(`/api/admin/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify(updates) });
    setSaving(false);
    if (r.ok) { fetchUsers(); setEditing(null); setMsg("✓ Updated!"); setTimeout(() => setMsg(""), 2000); }
  }

  const statusColor: Record<string, string> = { active: "#00C853", pending: "#ff9500", rejected: "#ff3b30", suspended: "#ff3b30" };
  const statusBg: Record<string, string> = { active: "#e8faf0", pending: "#fff9f0", rejected: "#fff0f0", suspended: "#fff0f0" };

  const pending = users.filter(u => u.status === "pending");
  const others = users.filter(u => u.status !== "pending");

  return (
    <div>
      <div style={{ background: "#fff", padding: "52px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>Sub-admins</h1>
      </div>
      {msg && <div style={{ background: "#e8faf0", padding: "10px 16px", color: "#00C853", fontSize: 13, fontWeight: 600 }}>{msg}</div>}

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {pending.length > 0 && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#ff9500", margin: "0 0 12px" }}>⏳ Pending Approval ({pending.length})</p>
            {pending.map(u => (
              <div key={u.id} style={{ borderBottom: "1px solid #f5f5f7", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>{u.fullName}</p>
                    <p style={{ fontSize: 12, color: "#8e8e93", margin: "0 0 2px" }}>@{u.username} · {u.email}</p>
                    {u.phone && <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{u.phone}</p>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => updateUser(u.id, { status: "active" })} style={{ flex: 1, background: "#00C853", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer" }}>Approve</button>
                  <button onClick={() => updateUser(u.id, { status: "rejected" })} style={{ flex: 1, background: "#fff0f0", border: "none", borderRadius: 10, color: "#ff3b30", fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer" }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {others.map(u => (
          <div key={u.id} style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>{u.fullName}</p>
                <p style={{ fontSize: 12, color: "#8e8e93", margin: "0 0 2px" }}>@{u.username} · {u.email}</p>
                <p style={{ fontSize: 13, color: "#111", margin: "0 0 2px" }}>Balance: <strong>${u.balance.toFixed(2)}</strong> · Rate: ৳{u.bdtRate}/$</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: statusColor[u.status], background: statusBg[u.status], borderRadius: 20, padding: "3px 10px" }}>{u.status.charAt(0).toUpperCase() + u.status.slice(1)}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => { setEditing(u); setEditForm({ bdtRate: String(u.bdtRate), newPassword: "", status: u.status }); }}
                style={{ background: "#f5f5f7", border: "none", borderRadius: 10, color: "#111", fontSize: 12, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}>Edit</button>
              {u.status === "active" && <button onClick={() => updateUser(u.id, { status: "suspended" })} style={{ background: "#fff0f0", border: "none", borderRadius: 10, color: "#ff3b30", fontSize: 12, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}>Suspend</button>}
              {u.status === "suspended" && <button onClick={() => updateUser(u.id, { status: "active" })} style={{ background: "#e8faf0", border: "none", borderRadius: 10, color: "#00C853", fontSize: 12, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}>Activate</button>}
              <button onClick={() => { if (confirm(`Clear $${u.balance.toFixed(2)} balance for ${u.displayName}?`)) updateUser(u.id, { clearBalance: "true" }); }}
                style={{ background: "#fff9f0", border: "none", borderRadius: 10, color: "#ff9500", fontSize: 12, fontWeight: 600, padding: "8px 14px", cursor: "pointer" }}>Clear Balance</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
          <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, margin: "0 auto", padding: "24px 20px 40px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Edit {editing.displayName}</h2>
              <button onClick={() => setEditing(null)} style={{ background: "#f5f5f7", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>BDT RATE (per $1)</label>
                <input style={{ width: "100%", background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 15, padding: "13px 16px", outline: "none" }}
                  type="number" value={editForm.bdtRate} onChange={e => setEditForm(p => ({ ...p, bdtRate: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>NEW PASSWORD (optional)</label>
                <input style={{ width: "100%", background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 15, padding: "13px 16px", outline: "none" }}
                  type="password" placeholder="Leave blank to keep current" value={editForm.newPassword} onChange={e => setEditForm(p => ({ ...p, newPassword: e.target.value }))} />
              </div>
              <button onClick={() => updateUser(editing.id, { bdtRate: editForm.bdtRate, ...(editForm.newPassword ? { newPassword: editForm.newPassword } : {}) })}
                disabled={saving} style={{ background: saving ? "#8e8e93" : "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "14px 0", cursor: saving ? "not-allowed" : "pointer" }}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WithdrawalsTab({ pw }: { pw: string }) {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState<"all"|"pending"|"paid"|"rejected">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { fetchWithdrawals(); }, []);
  async function fetchWithdrawals() {
    const r = await fetch("/api/admin/withdrawals", { headers: { "x-admin-password": pw } });
    if (r.ok) setWithdrawals(await r.json());
  }

  async function updateStatus(id: string, status: string, note?: string) {
    setProcessing(id);
    await fetch(`/api/admin/withdrawals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ status, note }) });
    setProcessing(null); fetchWithdrawals();
  }

  const filtered = withdrawals.filter(w => filter === "all" || w.status === filter);
  const pendingCount = withdrawals.filter(w => w.status === "pending").length;

  const sc: Record<string, string> = { paid: "#00C853", pending: "#ff9500", rejected: "#ff3b30" };
  const sb: Record<string, string> = { paid: "#e8faf0", pending: "#fff9f0", rejected: "#fff0f0" };

  return (
    <div>
      <div style={{ background: "#fff", padding: "52px 20px 14px", borderBottom: "1px solid #f0f0f0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>
          Withdrawals {pendingCount > 0 && <span style={{ background: "#ff3b30", color: "#fff", borderRadius: "50%", fontSize: 12, padding: "2px 7px", marginLeft: 6 }}>{pendingCount}</span>}
        </h1>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 16px", overflowX: "auto" }}>
        {(["pending","all","paid","rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ background: filter === f ? "#111" : "#fff", border: "none", borderRadius: 20, color: filter === f ? "#fff" : "#8e8e93", fontSize: 13, fontWeight: 600, padding: "8px 16px", cursor: "pointer", whiteSpace: "nowrap", boxShadow: filter === f ? "none" : "0 1px 4px rgba(0,0,0,0.08)" }}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" && `(${withdrawals.filter(w => w.status === f).length})`}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? <div style={{ background: "#fff", borderRadius: 20, padding: 32, textAlign: "center" }}><p style={{ color: "#8e8e93" }}>No withdrawals</p></div>
          : filtered.map(w => (
            <div key={w.id} style={{ background: "#fff", borderRadius: 16, overflow: "hidden" }}>
              <div onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 3px" }}>${w.amountUsd.toFixed(2)} · {w.userName}</p>
                  <p style={{ fontSize: 12, color: "#8e8e93", margin: "0 0 2px" }}>{w.method.toUpperCase()} · {new Date(w.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: sc[w.status], background: sb[w.status], borderRadius: 20, padding: "3px 10px" }}>{w.status.charAt(0).toUpperCase() + w.status.slice(1)}</span>
                  <span style={{ color: "#c7c7cc" }}>{expanded === w.id ? "▾" : "›"}</span>
                </div>
              </div>

              {expanded === w.id && (
                <div style={{ borderTop: "1px solid #f5f5f7", padding: "14px 16px" }}>
                  {/* Account details */}
                  <div style={{ background: "#f9f9f9", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    {w.method !== "bank" && w.accountNumber && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: 11, color: "#8e8e93", margin: "0 0 2px", fontWeight: 600 }}>ACCOUNT NUMBER</p>
                          <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>{w.accountNumber}</p>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(w.accountNumber!)}
                          style={{ background: "#fff", border: "1px solid #e5e5ea", borderRadius: 8, color: "#111", fontSize: 12, padding: "6px 12px", cursor: "pointer" }}>Copy</button>
                      </div>
                    )}
                    {w.method === "bank" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[["Account Holder", w.accountName], ["Account Number", w.accountNumber], ["Bank Name", w.bankName], ["Routing Number", w.routingNumber], ["District", w.district], ["Upazila", w.upazila]].filter(([, v]) => v).map(([l, v]) => (
                          <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <p style={{ fontSize: 11, color: "#8e8e93", margin: "0 0 1px", fontWeight: 600 }}>{String(l).toUpperCase()}</p>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "#111", margin: 0 }}>{String(v)}</p>
                            </div>
                            <button onClick={() => navigator.clipboard.writeText(String(v))}
                              style={{ background: "#fff", border: "1px solid #e5e5ea", borderRadius: 8, color: "#111", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>Copy</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {w.status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => updateStatus(w.id, "paid")} disabled={processing === w.id}
                        style={{ flex: 1, background: "#00C853", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, padding: "12px 0", cursor: "pointer" }}>
                        {processing === w.id ? "…" : "✓ Mark Paid"}
                      </button>
                      <button onClick={() => { const note = prompt("Rejection reason (optional):"); updateStatus(w.id, "rejected", note ?? undefined); }}
                        style={{ flex: 1, background: "#fff0f0", border: "none", borderRadius: 12, color: "#ff3b30", fontSize: 14, fontWeight: 700, padding: "12px 0", cursor: "pointer" }}>
                        ✕ Reject
                      </button>
                    </div>
                  )}
                  {w.note && <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 10 }}>Note: {w.note}</p>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

function SettingsTab({ pw, onLogout }: { pw: string; onLogout: () => void }) {
  const [settings, setSettings] = useState({ displayName: "", username: "", feePercentage: 0, email: "" });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings", { headers: { "x-admin-password": pw } }).then(r => r.json()).then(setSettings);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ currentPassword: pw, ...settings, ...(newPassword ? { newPassword } : {}) }) });
    const d = await r.json() as { error?: string };
    setSaving(false); setMsg(r.ok ? "✓ Saved!" : d.error ?? "Failed");
    if (r.ok) setNewPassword("");
  }

  const iStyle: React.CSSProperties = { width: "100%", background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 15, padding: "14px 16px", outline: "none" };
  const lStyle: React.CSSProperties = { fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div>
      <div style={{ background: "#fff", padding: "52px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>Settings</h1>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {msg && <div style={{ background: msg.startsWith("✓") ? "#e8faf0" : "#fff0f0", borderRadius: 12, padding: "10px 14px", color: msg.startsWith("✓") ? "#00C853" : "#ff3b30", fontSize: 13, fontWeight: 600 }}>{msg}</div>}

        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>Profile</p>
            <div><label style={lStyle}>Display Name</label><input style={iStyle} value={settings.displayName} onChange={e => setSettings(p => ({ ...p, displayName: e.target.value }))} /></div>
            <div>
              <label style={lStyle}>Username (your payment page URL)</label>
              <input style={iStyle} value={settings.username} onChange={e => setSettings(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))} placeholder="queen" />
              {settings.username && <p style={{ fontSize: 12, color: "#00C853", marginTop: 4 }}>pay-cash.shop/pay/{settings.username}</p>}
            </div>
            <div><label style={lStyle}>Recovery Email</label><input style={iStyle} type="email" value={settings.email} onChange={e => setSettings(p => ({ ...p, email: e.target.value }))} /></div>
            <div><label style={lStyle}>New Password</label><input style={iStyle} type="password" placeholder="Leave blank to keep" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>Payment</p>
            <div>
              <label style={lStyle}>Hidden Fee %</label>
              <input style={iStyle} type="number" step="0.1" min="0" value={settings.feePercentage} onChange={e => setSettings(p => ({ ...p, feePercentage: parseFloat(e.target.value) || 0 }))} />
              <p style={{ fontSize: 12, color: "#8e8e93", marginTop: 4 }}>e.g. 3% on $100 = customer pays $103</p>
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 10px" }}>Webhook URL</p>
            <div style={{ background: "#f5f5f7", borderRadius: 10, padding: "10px 12px", fontFamily: "monospace", fontSize: 12, color: "#111", wordBreak: "break-all", marginBottom: 8 }}>
              https://www.pay-cash.shop/api/webhook/speed
            </div>
            <button type="button" onClick={() => navigator.clipboard.writeText("https://www.pay-cash.shop/api/webhook/speed")}
              style={{ background: "#f5f5f7", border: "none", borderRadius: 10, color: "#111", fontSize: 13, fontWeight: 600, padding: "8px 16px", cursor: "pointer" }}>📋 Copy</button>
          </div>
          <button type="submit" disabled={saving}
            style={{ background: saving ? "#8e8e93" : "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </form>
        <button onClick={onLogout} style={{ background: "#fff", border: "none", borderRadius: 14, color: "#ff3b30", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: "pointer" }}>Sign Out</button>
      </div>
    </div>
  );
}
