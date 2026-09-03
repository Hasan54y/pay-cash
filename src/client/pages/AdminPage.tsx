import { registerPush } from "./../push";
import QRCanvas from "./../QRCanvas";
import { downloadQRCard } from "./../qrRenderer";
import ThemeToggle from "./../theme";
import { MilestonesCard } from "./../Milestones";
import { Avatar } from "./../Avatar";
import { fileToDataUrl } from "./../imageUpload";
import { useState, useEffect, useRef } from "react";

// Vector Icons
function IcoHome({ on }: { on: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>; }
function IcoCard({ on }: { on: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
function IcoUsers({ on }: { on: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>; }
function IcoMoney({ on }: { on: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
function IcoSettings({ on }: { on: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function IcoMail({ on }: { on: boolean }) { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on?"#00C853":"currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 6l10 7 10-7"/></svg>; }
function IcoLogout() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>; }

type Tab = "home" | "payments" | "users" | "withdrawals" | "messages" | "settings";

interface Payment { id: string; shortId: string; amountUsd: number; amountSats: number; status: string; createdAt: string; paidAt: string | null; checkedBy: string | null; lightningInvoice: string; subadminName: string | null; subadminUsername: string | null; }
interface AdminData { payments: Payment[]; totalRevenue: number; }
interface User { id: string; fullName: string; displayName: string; username: string; email: string; phone: string; balance: number; bdtRate: number; feePercentage?: number; status: string; createdAt: string; profilePic?: string | null; }
interface Withdrawal { id: string; userId: string; amountUsd: number; method: string; accountNumber: string | null; accountName: string | null; bankName: string | null; routingNumber: string | null; district: string | null; upazila: string | null; status: string; createdAt: string; paidAt: string | null; userName: string; userUsername: string; note: string | null; }
interface ContactMessage { id: string; email: string; subject: string; message: string; status: string; createdAt: string; }

const NAV_ITEMS: { key: Tab; label: string; icon: (on: boolean) => React.ReactNode }[] = [
  { key: "home", label: "Home", icon: (on) => <IcoHome on={on} /> },
  { key: "payments", label: "Payments", icon: (on) => <IcoCard on={on} /> },
  { key: "users", label: "Users", icon: (on) => <IcoUsers on={on} /> },
  { key: "withdrawals", label: "Withdraw", icon: (on) => <IcoMoney on={on} /> },
  { key: "messages", label: "Messages", icon: (on) => <IcoMail on={on} /> },
  { key: "settings", label: "Settings", icon: (on) => <IcoSettings on={on} /> },
];
// Withdraw and Messages live inside Settings on mobile instead of taking a bottom-bar slot.
const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(i => i.key !== "withdrawals" && i.key !== "messages");

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
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-visual">
        <div className="auth-visual-brand">
          <img src="/cashapp-logo.png" alt="" />
          <span>Pay Cash</span>
        </div>
        <div className="auth-visual-copy">
          <h2>Admin control center.</h2>
          <p>Review payments, approve sub-admins, and process withdrawals across the whole platform.</p>
        </div>
        <div className="auth-visual-foot">Admin access · Pay Cash</div>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">
          <img className="logo" src="/cashapp-logo.png" alt="" />
          <h1>Pay Cash</h1>
          <p className="subtitle">Admin Dashboard</p>
          <form onSubmit={login} className="auth-form">
            <input className="input" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Admin password" required style={{ textAlign: "center" }} />
            {authError && <p className="error-text">{authError}</p>}
            <button type="submit" className="btn btn-primary btn-block">Sign In</button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="shell">
      <ThemeToggle />
      <nav className="sidebar">
        <div className="sidebar-brand">
          <img src="/cashapp-logo.png" alt="" />
          <span>Pay Cash Admin</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {NAV_ITEMS.map(item => (
            <button key={item.key} className={`sidebar-link ${tab === item.key ? "active" : ""}`} onClick={() => setTab(item.key)}>
              {item.icon(tab === item.key)}
              {item.label}
            </button>
          ))}
        </div>
        <div className="sidebar-foot">
          <button className="sidebar-link" onClick={() => { localStorage.removeItem("admin_pw"); setAuthed(false); setPw(""); }}>
            <IcoLogout /> Sign Out
          </button>
        </div>
      </nav>

      <div className="shell-content">
        <div className="shell-inner">
          {tab === "home" && <HomeTab pw={pw} />}
          {tab === "payments" && <PaymentsTab pw={pw} />}
          {tab === "users" && <UsersTab pw={pw} />}
          {tab === "withdrawals" && <WithdrawalsTab pw={pw} />}
          {tab === "messages" && <MessagesTab pw={pw} />}
          {tab === "settings" && <SettingsTab pw={pw} setTab={setTab} onLogout={() => { localStorage.removeItem("admin_pw"); setAuthed(false); setPw(""); }} />}
        </div>
      </div>

      <div className="bottom-nav">
        {MOBILE_NAV_ITEMS.map(item => (
          <button key={item.key} onClick={() => setTab(item.key)}>
            {item.icon(tab === item.key)}
            <span className="bottom-nav-label" style={{ color: tab === item.key ? "#00C853" : "var(--text-muted)" }}>{item.label}</span>
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
  const payLink = adminUsername ? `https://realcash.online/pay/${adminUsername}` : `https://realcash.online`;

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
    <div>
      <div className="hero-panel">
        <div className="hero-top">
          <div className="hero-brand">
            <img src="/cashapp-logo.png" alt="" />
            <span>Pay {displayName}</span>
          </div>
          <span className="live-badge"><span className="live-dot" />Live</span>
        </div>
        <div className="balance-card">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{ borderRight: "1px solid rgba(255,255,255,0.08)", paddingRight: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>Present Balance</p>
              <p style={{ fontSize: 24, fontWeight: 900, marginBottom: 2, color: "#00C853" }}>${walletBalance != null ? walletBalance.toFixed(2) : "…"}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Speed Wallet</p>
            </div>
            <div style={{ paddingLeft: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", marginBottom: 6 }}>Total Revenue</p>
              <p style={{ fontSize: 24, fontWeight: 900, marginBottom: 2, color: "#fff" }}>${totalRevenue.toFixed(2)}</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{paid.length} payments</p>
            </div>
          </div>
        </div>
      </div>

      <div className="section-stack">
        <div className="stat-grid">
          <div className="stat-tile">
            <p className="stat-label">Today</p>
            <p className="stat-value">${todayTotal.toFixed(2)}</p>
            <p className="stat-sub">{todayPaid.length} paid</p>
          </div>
          <div className="stat-tile">
            <p className="stat-label">All Time</p>
            <p className="stat-value">{paid.length}</p>
            <p className="stat-sub">payments</p>
          </div>
        </div>

        <MilestonesCard payments={payments} totalRevenue={totalRevenue} />

        <div className="two-col">
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Recent Transactions</p>
            {last10.length === 0 ? <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>No transactions yet</p>
              : last10.map(p => <PaymentRowSimple key={p.id} p={p} />)}
          </div>

          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 12 }}>Scan to pay with cash app</p>
            <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
              <div style={{ background: "var(--surface-alt)", borderRadius: 12, padding: 8, flexShrink: 0 }}>
                <QRCanvas data={payLink} size={120} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                <p style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all" }}>
                  {adminUsername ? `realcash.online/pay/${adminUsername}` : "Set username in Settings"}
                </p>
                <button onClick={() => { navigator.clipboard.writeText(payLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn btn-dark" style={{ fontSize: 13, padding: "10px 0" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <button onClick={() => downloadQRCard(payLink, displayName)} className="btn btn-muted" style={{ fontSize: 13, padding: "10px 0" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentRowSimple({ p }: { p: Payment }) {
  const sc: Record<string, string> = { paid: "var(--primary-dark)", pending: "var(--warning-soft-text)", expired: "var(--text-muted)" };
  const sb: Record<string, string> = { paid: "var(--primary-soft)", pending: "var(--warning-soft)", expired: "var(--neutral-soft)" };
  const sl: Record<string, string> = { paid: "Completed", pending: "Pending", expired: "Expired" };
  return (
    <div className="list-row">
      <div className="row-left">
        <div className="row-icon" style={{ background: sb[p.status] ?? "#f5f5f7", fontSize: 16 }}>
          {p.status === "paid" ? "✓" : p.status === "expired" ? "✕" : "⏳"}
        </div>
        <div>
          <p className="row-title">${p.amountUsd.toFixed(2)} {p.subadminName && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>· {p.subadminName}</span>}</p>
          <p className="row-sub">{new Date(p.paidAt ?? p.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      </div>
      <span className="badge" style={{ color: sc[p.status], background: sb[p.status] }}>{sl[p.status] ?? p.status}</span>
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

  useEffect(() => {
    const fetchPayments = () => fetch("/api/admin/payments", { headers: { "x-admin-password": pw } }).then(r => r.json()).then(setData);
    fetchPayments();
    // Payment status is reconciled against Speed server-side on every fetch, so
    // polling here keeps the list current without needing a manual sync.
    const iv = setInterval(fetchPayments, 30000);
    return () => clearInterval(iv);
  }, []);

  async function sync() {
    setSyncing(true); setSyncMsg("");
    await fetch("/api/admin/sync", { method: "POST", headers: { "x-admin-password": pw } });
    setSyncing(false); setSyncMsg("Synced");
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

  const sc: Record<string, string> = { paid: "var(--primary-dark)", pending: "var(--warning-soft-text)", expired: "var(--text-muted)" };
  const sb: Record<string, string> = { paid: "var(--primary-soft)", pending: "var(--warning-soft)", expired: "var(--neutral-soft)" };
  const sl: Record<string, string> = { paid: "Completed", pending: "Pending", expired: "Expired" };

  return (
    <div>
      <div className="mobile-topbar">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1>Payments</h1>
          <button onClick={sync} disabled={syncing} className="btn btn-muted btn-pill btn-sm" style={{ color: syncing ? "var(--text-muted)" : "var(--text)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: syncing ? "spin 1s linear infinite" : "none" }}><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            {syncing ? "Syncing…" : "Sync"}
          </button>
        </div>
        {syncMsg && <p style={{ color: "var(--primary)", fontSize: 12, marginTop: 6, fontWeight: 600 }}>{syncMsg}</p>}
      </div>
      <div className="chip-row">
        {(["all","paid","pending","expired"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "active" : ""}`}>
            {f === "paid" ? "Completed" : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>
      <div style={{ paddingBottom: 24 }}>
        {grouped.length === 0 ? <div className="card" style={{ padding: 32, textAlign: "center" }}><p style={{ color: "var(--text-muted)" }}>No payments</p></div>
          : grouped.map(({ label, items }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", margin: "0 0 8px 4px" }}>{label}</p>
              <div className="card" style={{ padding: "4px 16px" }}>
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
      <div style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--surface-alt)", gap: 10 }}>
        <button onClick={onToggle} style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${isChecked ? "var(--primary)" : "var(--text-faint)"}`, background: isChecked ? "var(--primary)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, padding: 0 }}>
          {isChecked && <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div onClick={() => setOpen(v => !v)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 2px", opacity: isChecked ? 0.4 : 1 }}>
              ${p.amountUsd.toFixed(2)}
              {p.subadminName && <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>· {p.subadminName}</span>}
            </p>
            <p className="row-sub">{new Date(p.paidAt ?? p.createdAt).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="badge" style={{ color: sc[p.status] ?? "#888", background: sb[p.status] ?? "#f5f5f7" }}>{sl[p.status] ?? p.status}</span>
            <span style={{ color: "var(--chevron)", fontSize: 16 }}>{open ? "▾" : "›"}</span>
          </div>
        </div>
      </div>
      {open && (
        <div style={{ background: "var(--surface-alt)", borderRadius: 12, padding: "12px 14px", margin: "4px 0 8px" }}>
          {[["Transaction ID", p.shortId, true], ["Amount (sats)", p.amountSats.toLocaleString(), false], ["Status", sl[p.status] ?? p.status, false], ...(p.subadminName ? [["Sub-admin", p.subadminName, false]] : []), ["Created", new Date(p.createdAt).toLocaleString(), false], ...(p.paidAt ? [["Paid at", new Date(p.paidAt).toLocaleString(), false]] : [])].map(([l, v, m]) => (
            <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <p style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{String(l)}</p>
              <p style={{ fontSize: 12, fontFamily: m ? "monospace" : "inherit", textAlign: "right", maxWidth: "60%" }}>{String(v)}</p>
            </div>
          ))}
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 4px", fontWeight: 600 }}>Invoice</p>
            <p style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace", wordBreak: "break-all", margin: "0 0 8px" }}>{p.lightningInvoice.slice(0, 40)}...</p>
            <button onClick={() => navigator.clipboard.writeText(p.lightningInvoice)} className="btn btn-outline btn-sm">
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
  const [editForm, setEditForm] = useState({ bdtRate: "", feePercentage: "", newPassword: "", status: "", balance: "" });
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

  async function deleteUser(u: User) {
    if (!confirm(`Delete ${u.displayName} (@${u.username})? This removes the account and its payment page permanently. Their balance is $${u.balance.toFixed(2)} — make sure any pending payout is settled first.`)) return;
    setSaving(true);
    const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE", headers: { "x-admin-password": pw } });
    setSaving(false);
    if (r.ok) { fetchUsers(); setMsg("✓ Deleted"); setTimeout(() => setMsg(""), 2000); }
  }

  const statusColor: Record<string, string> = { active: "var(--primary-dark)", pending: "var(--warning-soft-text)", rejected: "var(--danger)", suspended: "var(--danger)" };
  const statusBg: Record<string, string> = { active: "var(--primary-soft)", pending: "var(--warning-soft)", rejected: "var(--danger-soft)", suspended: "var(--danger-soft)" };

  const pending = users.filter(u => u.status === "pending");
  const others = users.filter(u => u.status !== "pending");

  return (
    <div>
      <div className="mobile-topbar"><h1>Sub-admins</h1></div>
      {msg && <div style={{ background: "var(--primary-soft)", padding: "10px 16px", color: "var(--primary-dark)", fontSize: 13, fontWeight: 600, borderRadius: 12, marginTop: 12 }}>{msg}</div>}

      <div className="section-stack" style={{ padding: "16px 0" }}>
        {pending.length > 0 && (
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "var(--warning-soft-text)", marginBottom: 12 }}>⏳ Pending Approval ({pending.length})</p>
            {pending.map(u => (
              <div key={u.id} style={{ borderBottom: "1px solid var(--surface-alt)", paddingBottom: 12, marginBottom: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{u.fullName}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>@{u.username} · {u.email}</p>
                  {u.phone && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.phone}</p>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => updateUser(u.id, { status: "active" })} className="btn btn-success-soft btn-sm" style={{ flex: 1 }}>Approve</button>
                  <button onClick={() => updateUser(u.id, { status: "rejected" })} className="btn btn-danger-soft btn-sm" style={{ flex: 1 }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card-grid">
          {others.map(u => (
            <div key={u.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{u.fullName}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 2 }}>@{u.username} · {u.email}</p>
                  <p style={{ fontSize: 13 }}>Balance: <strong>${u.balance.toFixed(2)}</strong> · Rate: ৳{u.bdtRate}/$ · Fee: {u.feePercentage ?? 0}%</p>
                </div>
                <span className="badge" style={{ color: statusColor[u.status], background: statusBg[u.status] }}>{u.status.charAt(0).toUpperCase() + u.status.slice(1)}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => { setEditing(u); setEditForm({ bdtRate: String(u.bdtRate), feePercentage: String(u.feePercentage ?? 0), newPassword: "", status: u.status, balance: String(u.balance) }); }} className="btn btn-muted btn-sm">Edit</button>
                {u.status === "active" && <button onClick={() => updateUser(u.id, { status: "suspended" })} className="btn btn-danger-soft btn-sm">Suspend</button>}
                {u.status === "suspended" && <button onClick={() => updateUser(u.id, { status: "active" })} className="btn btn-success-soft btn-sm">Activate</button>}
                <button onClick={() => { if (confirm(`Clear $${u.balance.toFixed(2)} balance for ${u.displayName}?`)) updateUser(u.id, { clearBalance: "true" }); }} className="btn btn-sm" style={{ background: "var(--warning-soft)", color: "var(--warning-soft-text)" }}>Clear Balance</button>
                <button onClick={() => deleteUser(u)} className="btn btn-danger-soft btn-sm">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Edit {editing.displayName}</h2>
              <button onClick={() => setEditing(null)} style={{ background: "var(--surface-alt)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="field">
                <label className="field-label">BALANCE (USD)</label>
                <input className="input" type="number" step="0.01" min="0" value={editForm.balance} onChange={e => setEditForm(p => ({ ...p, balance: e.target.value }))} />
                <p className="hint" style={{ color: "var(--text-muted)" }}>Directly sets the sub-admin's present balance.</p>
              </div>
              <div className="field">
                <label className="field-label">BDT RATE (per $1)</label>
                <input className="input" type="number" value={editForm.bdtRate} onChange={e => setEditForm(p => ({ ...p, bdtRate: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">FEE %</label>
                <input className="input" type="number" step="0.1" min="0" max="50" placeholder="0" value={editForm.feePercentage} onChange={e => setEditForm(p => ({ ...p, feePercentage: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">NEW PASSWORD (optional)</label>
                <input className="input" type="password" placeholder="Leave blank to keep current" value={editForm.newPassword} onChange={e => setEditForm(p => ({ ...p, newPassword: e.target.value }))} />
              </div>
              <button onClick={() => updateUser(editing.id, { bdtRate: editForm.bdtRate, feePercentage: editForm.feePercentage, balance: editForm.balance, ...(editForm.newPassword ? { newPassword: editForm.newPassword } : {}) })}
                disabled={saving} className={`btn ${saving ? "btn-disabled-look" : "btn-primary"}`} style={{ color: "#fff" }}>
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

  const sc: Record<string, string> = { paid: "var(--primary-dark)", pending: "var(--warning-soft-text)", rejected: "var(--danger)" };
  const sb: Record<string, string> = { paid: "var(--primary-soft)", pending: "var(--warning-soft)", rejected: "var(--danger-soft)" };

  return (
    <div>
      <div className="mobile-topbar">
        <h1>
          Withdrawals {pendingCount > 0 && <span style={{ background: "var(--danger)", color: "#fff", borderRadius: "50%", fontSize: 12, padding: "2px 7px", marginLeft: 6 }}>{pendingCount}</span>}
        </h1>
      </div>

      <div className="chip-row">
        {(["pending","all","paid","rejected"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`chip ${filter === f ? "active" : ""}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)} {f !== "all" && `(${withdrawals.filter(w => w.status === f).length})`}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 24 }}>
        {filtered.length === 0 ? <div className="card" style={{ padding: 32, textAlign: "center" }}><p style={{ color: "var(--text-muted)" }}>No withdrawals</p></div>
          : filtered.map(w => (
            <div key={w.id} className="card" style={{ overflow: "hidden" }}>
              <div onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 3 }}>${w.amountUsd.toFixed(2)} · {w.userName}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{w.method.toUpperCase()} · {new Date(w.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge" style={{ color: sc[w.status], background: sb[w.status] }}>{w.status.charAt(0).toUpperCase() + w.status.slice(1)}</span>
                  <span style={{ color: "var(--chevron)" }}>{expanded === w.id ? "▾" : "›"}</span>
                </div>
              </div>

              {expanded === w.id && (
                <div style={{ borderTop: "1px solid var(--surface-alt)", padding: "14px 16px" }}>
                  <div style={{ background: "var(--surface-alt)", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    {w.method !== "bank" && w.accountNumber && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, fontWeight: 600 }}>ACCOUNT NUMBER</p>
                          <p style={{ fontSize: 15, fontWeight: 700 }}>{w.accountNumber}</p>
                        </div>
                        <button onClick={() => navigator.clipboard.writeText(w.accountNumber!)} className="btn btn-outline btn-sm">Copy</button>
                      </div>
                    )}
                    {w.method === "bank" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[["Account Holder", w.accountName], ["Account Number", w.accountNumber], ["Bank Name", w.bankName], ["Routing Number", w.routingNumber], ["District", w.district], ["Upazila", w.upazila]].filter(([, v]) => v).map(([l, v]) => (
                          <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 1, fontWeight: 600 }}>{String(l).toUpperCase()}</p>
                              <p style={{ fontSize: 14, fontWeight: 600 }}>{String(v)}</p>
                            </div>
                            <button onClick={() => navigator.clipboard.writeText(String(v))} className="btn btn-outline btn-sm">Copy</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {w.status === "pending" && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => updateStatus(w.id, "paid")} disabled={processing === w.id} className="btn btn-primary" style={{ flex: 1 }}>
                        {processing === w.id ? "…" : "✓ Mark Paid"}
                      </button>
                      <button onClick={() => { const note = prompt("Rejection reason (optional):"); updateStatus(w.id, "rejected", note ?? undefined); }} className="btn btn-danger-soft" style={{ flex: 1 }}>
                        ✕ Reject
                      </button>
                    </div>
                  )}
                  {w.note && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 10 }}>Note: {w.note}</p>}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

function MessagesTab({ pw }: { pw: string }) {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { fetchMessages(); }, []);
  async function fetchMessages() {
    const r = await fetch("/api/admin/contact-messages", { headers: { "x-admin-password": pw } });
    if (r.ok) setMessages(await r.json());
  }

  async function open(id: string, status: string) {
    setExpanded(expanded === id ? null : id);
    if (status === "unread") {
      await fetch(`/api/admin/contact-messages/${id}`, { method: "PUT", headers: { "x-admin-password": pw } });
      setMessages(ms => ms.map(m => m.id === id ? { ...m, status: "read" } : m));
    }
  }

  const unreadCount = messages.filter(m => m.status === "unread").length;

  return (
    <div>
      <div className="mobile-topbar">
        <h1>
          Messages {unreadCount > 0 && <span style={{ background: "var(--danger)", color: "#fff", borderRadius: "50%", fontSize: 12, padding: "2px 7px", marginLeft: 6 }}>{unreadCount}</span>}
        </h1>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 24 }}>
        {messages.length === 0 ? <div className="card" style={{ padding: 32, textAlign: "center" }}><p style={{ color: "var(--text-muted)" }}>No messages</p></div>
          : messages.map(m => (
            <div key={m.id} className="card" style={{ overflow: "hidden" }}>
              <div onClick={() => open(m.id, m.status)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: m.status === "unread" ? 800 : 700, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.email} · {new Date(m.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {m.status === "unread" && <span className="badge" style={{ color: "var(--danger)", background: "var(--danger-soft)" }}>New</span>}
                  <span style={{ color: "var(--chevron)" }}>{expanded === m.id ? "▾" : "›"}</span>
                </div>
              </div>
              {expanded === m.id && (
                <div style={{ borderTop: "1px solid var(--surface-alt)", padding: "14px 16px" }}>
                  <p style={{ fontSize: 14, whiteSpace: "pre-wrap" }}>{m.message}</p>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}

function SettingsTab({ pw, onLogout, setTab }: { pw: string; onLogout: () => void; setTab: (t: Tab) => void }) {
  const [settings, setSettings] = useState<{ displayName: string; username: string; feePercentage: number; email: string; profilePic: string | null }>({ displayName: "", username: "", feePercentage: 0, email: "", profilePic: null });
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings", { headers: { "x-admin-password": pw } }).then(r => r.json()).then(setSettings);
  }, []);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await fileToDataUrl(file); setSettings(p => ({ ...p, profilePic: url })); }
    catch { setMsg("Couldn't read that image"); }
    e.target.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ currentPassword: pw, ...settings, ...(newPassword ? { newPassword } : {}) }) });
    const d = await r.json() as { error?: string };
    setSaving(false); setMsg(r.ok ? "✓ Saved!" : d.error ?? "Failed");
    if (r.ok) setNewPassword("");
  }

  return (
    <div>
      <div className="mobile-topbar"><h1>Settings</h1></div>
      <div className="section-stack" style={{ maxWidth: 560 }}>
        {msg && <div style={{ background: msg.startsWith("✓") ? "var(--primary-soft)" : "var(--danger-soft)", borderRadius: 12, padding: "10px 14px", color: msg.startsWith("✓") ? "var(--primary-dark)" : "var(--danger)", fontSize: 13, fontWeight: 600 }}>{msg}</div>}

        <div className="card" style={{ overflow: "hidden" }}>
          <button onClick={() => setTab("withdrawals")} className="list-row" style={{ width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
            <div className="row-left"><IcoMoney on={false} /><span className="row-title" style={{ marginBottom: 0 }}>Withdrawals</span></div>
            <span style={{ color: "var(--chevron)" }}>›</span>
          </button>
          <button onClick={() => setTab("messages")} className="list-row" style={{ width: "100%", padding: "14px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
            <div className="row-left"><IcoMail on={false} /><span className="row-title" style={{ marginBottom: 0 }}>Messages</span></div>
            <span style={{ color: "var(--chevron)" }}>›</span>
          </button>
        </div>

        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>Profile</p>
            <label className="avatar-upload">
              <Avatar name={settings.displayName || "Pay Cash"} img={settings.profilePic} seed={settings.username || "pay-cash"} size={72} />
              <span className="avatar-upload-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </span>
              <input type="file" accept="image/*" onChange={onPickPhoto} />
            </label>
            <div className="field"><label className="field-label">Display Name</label><input className="input" value={settings.displayName} onChange={e => setSettings(p => ({ ...p, displayName: e.target.value }))} /></div>
            <div className="field">
              <label className="field-label">Username (your payment page URL)</label>
              <input className="input" value={settings.username} onChange={e => setSettings(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))} placeholder="queen" />
              {settings.username && <p className="hint">realcash.online/pay/{settings.username}</p>}
            </div>
            <div className="field"><label className="field-label">Recovery Email</label><input className="input" type="email" value={settings.email} onChange={e => setSettings(p => ({ ...p, email: e.target.value }))} /></div>
            <div className="field"><label className="field-label">New Password</label><input className="input" type="password" placeholder="Leave blank to keep" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
          </div>
          <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>Payment</p>
            <div className="field">
              <label className="field-label">Fee %</label>
              <input className="input" type="number" step="0.1" min="0" value={settings.feePercentage} onChange={e => setSettings(p => ({ ...p, feePercentage: parseFloat(e.target.value) || 0 }))} />
              <p className="hint" style={{ color: "var(--text-muted)" }}>e.g. 3% on $100 = customer pays $103</p>
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>Webhook URL</p>
            <div style={{ background: "var(--surface-alt)", borderRadius: 10, padding: "10px 12px", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", marginBottom: 8 }}>
              https://realcash.online/api/webhook/speed
            </div>
            <button type="button" onClick={() => navigator.clipboard.writeText("https://realcash.online/api/webhook/speed")} className="btn btn-muted btn-sm">📋 Copy</button>
          </div>
          <button type="submit" disabled={saving} className={`btn ${saving ? "btn-disabled-look" : "btn-primary"}`} style={{ color: "#fff" }}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </form>
        <button onClick={onLogout} className="card btn" style={{ color: "var(--danger)", boxShadow: "var(--shadow-sm)" }}>Sign Out</button>
      </div>
    </div>
  );
}
