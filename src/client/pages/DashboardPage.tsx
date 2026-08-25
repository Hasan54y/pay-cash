import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCanvas from "./../QRCanvas";
import { downloadQRCard } from "./../qrRenderer";
import { registerPush } from "./../push";
import ThemeToggle from "./../theme";
import { MilestonesCard } from "./../Milestones";
import { Avatar } from "./../Avatar";
import { fileToDataUrl } from "./../imageUpload";

type Tab = "home" | "payments" | "paypage" | "settings";

interface UserInfo { id: string; fullName: string; displayName: string; username: string; email: string; phone: string; balance: number; bdtRate: number; profilePic: string | null; }
interface Payment { id: string; shortId: string; amountUsd: number; amountSats: number; status: string; createdAt: string; paidAt: string | null; checkedBy: string | null; lightningInvoice: string; }
interface Withdrawal { id: string; amountUsd: number; method: string; status: string; createdAt: string; }
interface DashboardData { payments: Payment[]; totalRevenue: number; }

// Vector Icons
function IconHome({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
}
function IconCard({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
}
function IconQR({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="19" y1="14" x2="19" y2="14"/><line x1="19" y1="19" x2="21" y2="19"/><line x1="21" y1="14" x2="21" y2="17"/></svg>;
}
function IconSettings({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
function IconWithdraw({ active }: { active: boolean }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
}
function IconLogout() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
}

const NAV_ITEMS: { key: Tab; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  { key: "home", label: "Home", icon: (a) => <IconHome active={a} /> },
  { key: "payments", label: "Payments", icon: (a) => <IconCard active={a} /> },
  { key: "paypage", label: "Pay Page", icon: (a) => <IconQR active={a} /> },
  { key: "settings", label: "Settings", icon: (a) => <IconSettings active={a} /> },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("user_token") ?? "";
  const [user, setUser] = useState<UserInfo | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [paymentsFilter, setPaymentsFilter] = useState<"all" | "paid" | "pending" | "expired" | "withdraw">("all");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchAll();
    // Register push with user id from token
    registerPush(token);
    const iv = setInterval(fetchAll, 30000);
    return () => clearInterval(iv);
  }, []);

  async function fetchAll() {
    const [u, d, w] = await Promise.all([
      fetch("/api/dashboard/me", { headers: { "x-user-token": token } }),
      fetch("/api/dashboard/payments", { headers: { "x-user-token": token } }),
      fetch("/api/dashboard/withdrawals", { headers: { "x-user-token": token } }),
    ]);
    if (!u.ok) { navigate("/login"); return; }
    setUser(await u.json());
    if (d.ok) setData(await d.json());
    if (w.ok) setWithdrawals(await w.json());
  }

  if (!user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "var(--bg)" }}>
      <div className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
    </div>
  );

  const payLink = `https://pay-cash.shop/pay/${user.username}`;
  const payments = data?.payments ?? [];
  const totalRevenue = data?.totalRevenue ?? 0;
  const paid = payments.filter(p => p.status === "paid");
  const todayPaid = paid.filter(p => p.paidAt && new Date(p.paidAt).toDateString() === new Date().toDateString());
  const todayTotal = todayPaid.reduce((s, p) => s + p.amountUsd, 0);

  function logout() { localStorage.removeItem("user_token"); localStorage.removeItem("user_role"); navigate("/login"); }

  const sc: Record<string, string> = { paid: "#00C853", pending: "#ff9500", expired: "rgba(0,0,0,0.4)" };
  const sb: Record<string, string> = { paid: "#e8faf0", pending: "#fff9f0", expired: "rgba(0,0,0,0.06)" };
  const sl: Record<string, string> = { paid: "Completed", pending: "Pending", expired: "Expired" };

  function PaymentRow({ p }: { p: Payment }) {
    return (
      <div className="list-row">
        <div className="row-left">
          <div className="row-icon" style={{ background: sb[p.status] ?? "#f5f5f7" }}>
            {p.status === "paid"
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              : p.status === "expired"
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
          </div>
          <div>
            <p className="row-title">${p.amountUsd.toFixed(2)}</p>
            <p className="row-sub">{new Date(p.paidAt ?? p.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {p.checkedBy && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
          <span className="badge" style={{ color: sc[p.status], background: sb[p.status] }}>{sl[p.status] ?? p.status}</span>
        </div>
      </div>
    );
  }

  const wsc: Record<string, string> = { paid: "var(--primary-dark)", pending: "#b45309", rejected: "var(--danger)" };
  const wsb: Record<string, string> = { paid: "var(--primary-soft)", pending: "var(--warning-soft)", rejected: "var(--danger-soft)" };

  function WithdrawalRow({ w }: { w: Withdrawal }) {
    return (
      <div className="list-row">
        <div>
          <p className="row-title">${w.amountUsd.toFixed(2)}</p>
          <p className="row-sub">{w.method.toUpperCase()} · {new Date(w.createdAt).toLocaleDateString()}</p>
        </div>
        <span className="badge" style={{ color: wsc[w.status] ?? "var(--text-muted)", background: wsb[w.status] ?? "var(--surface-alt)" }}>
          {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
        </span>
      </div>
    );
  }

  const paymentCounts = {
    all: payments.filter(p => p.status !== "expired").length,
    paid: payments.filter(p => p.status === "paid").length,
    pending: payments.filter(p => p.status === "pending").length,
    expired: payments.filter(p => p.status === "expired").length,
  };
  const filteredPayments = paymentsFilter === "all" || paymentsFilter === "withdraw"
    ? payments.filter(p => p.status !== "expired")
    : payments.filter(p => p.status === paymentsFilter);

  return (
    <div className="shell">
      <ThemeToggle />
      <nav className="sidebar">
        <div className="sidebar-brand">
          <img src="/cashapp-logo.png" alt="" />
          <span>{user.displayName}</span>
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
          <button className="sidebar-link" onClick={logout}><IconLogout /> Sign Out</button>
        </div>
      </nav>

      <div className="shell-content">
        <div className="shell-inner">

          {/* HOME TAB */}
          {tab === "home" && (
            <div>
              <div className="hero-panel">
                <div className="hero-top">
                  <div className="hero-brand">
                    <img src="/cashapp-logo.png" alt="" />
                    <span>{user.displayName}</span>
                  </div>
                  <span className="live-badge"><span className="live-dot" />Live</span>
                </div>
                <div className="balance-card">
                  <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Present Balance</p>
                  <p style={{ fontSize: 36, fontWeight: 900, color: "#00C853", marginBottom: 2 }}>${user.balance.toFixed(2)}</p>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 16 }}>≈ ৳{Math.round(user.balance * user.bdtRate).toLocaleString()} <span style={{ fontSize: 12 }}>@ ৳{user.bdtRate}/$</span></p>
                  <button onClick={() => setShowWithdraw(true)} className="btn btn-primary btn-pill btn-sm">
                    <IconWithdraw active={true} /> Withdraw
                  </button>
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
                    <p className="stat-label">Total</p>
                    <p className="stat-value">${totalRevenue.toFixed(2)}</p>
                    <p className="stat-sub">{paid.length} payments</p>
                  </div>
                </div>

                <MilestonesCard payments={payments} totalRevenue={totalRevenue} />

                <div className="card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Recent Transactions</p>
                  {payments.slice(0, 10).length === 0
                    ? <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "16px 0", fontSize: 14 }}>No transactions yet</p>
                    : payments.filter(p => !(p.status === "expired" && Date.now() - new Date(p.createdAt).getTime() > 600000)).slice(0, 10).map(p => (
                      <PaymentRow key={p.id} p={p} />
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* PAYMENTS TAB */}
          {tab === "payments" && (
            <div>
              <div className="mobile-topbar"><h1>All Payments</h1></div>
              <div className="chip-row" style={{ padding: "0 16px 12px" }}>
                {([
                  ["all", "All", paymentCounts.all],
                  ["paid", "Completed", paymentCounts.paid],
                  ["pending", "Pending", paymentCounts.pending],
                  ["expired", "Expired", paymentCounts.expired],
                  ["withdraw", "Withdraw", withdrawals.length],
                ] as const).map(([key, label, count]) => (
                  <button key={key} onClick={() => setPaymentsFilter(key)} className={`chip ${paymentsFilter === key ? "active" : ""}`}>
                    {label} ({count})
                  </button>
                ))}
              </div>
              <div className="section-stack">
                {paymentsFilter === "withdraw" ? (
                  <>
                    <button onClick={() => setShowWithdraw(true)} className="btn btn-primary btn-pill btn-sm" style={{ alignSelf: "flex-start" }}>+ New Withdrawal</button>
                    {withdrawals.length === 0
                      ? <div className="card" style={{ padding: 40, textAlign: "center" }}><p style={{ color: "var(--text-muted)" }}>No withdrawals yet</p></div>
                      : <div className="card" style={{ padding: "4px 16px" }}>
                        {withdrawals.map(w => <WithdrawalRow key={w.id} w={w} />)}
                      </div>}
                  </>
                ) : (
                  filteredPayments.length === 0
                    ? <div className="card" style={{ padding: 40, textAlign: "center" }}><p style={{ color: "var(--text-muted)" }}>No payments</p></div>
                    : <div className="card" style={{ padding: "4px 16px" }}>
                      {filteredPayments.map(p => <PaymentRow key={p.id} p={p} />)}
                    </div>
                )}
              </div>
            </div>
          )}

          {/* PAYMENT PAGE TAB */}
          {tab === "paypage" && (
            <div>
              <div className="mobile-topbar"><h1>Payment Page</h1></div>
              <div className="section-stack" style={{ maxWidth: 460 }}>
                <div className="card" style={{ padding: 20 }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 16 }}>Scan to pay with cash app</p>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                    <div style={{ background: "var(--surface-alt)", borderRadius: 20, padding: 16 }}>
                      <QRCanvas data={payLink} size={200} />
                    </div>
                  </div>
                  <p style={{ fontSize: 20, fontWeight: 900, textAlign: "center", marginBottom: 16, fontFamily: "Arial Black, Arial, sans-serif" }}>{user.displayName}</p>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 16 }}>pay-cash.shop/pay/{user.username}</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={() => { navigator.clipboard.writeText(payLink); }} className="btn btn-dark" style={{ flex: 1, fontSize: 14, padding: "13px 0" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                      Copy Link
                    </button>
                    <button onClick={() => downloadQRCard(payLink, user.displayName)} className="btn btn-muted" style={{ flex: 1, fontSize: 14, padding: "13px 0" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download QR
                    </button>
                  </div>
                </div>

                <a href={payLink} target="_blank" rel="noreferrer" className="card"
                  style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Open Payment Page</p>
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>pay-cash.shop/pay/{user.username}</p>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {tab === "settings" && (
            <SettingsTab token={token} user={user} onUpdate={fetchAll} onLogout={logout} withdrawals={withdrawals} onWithdraw={() => setShowWithdraw(true)} />
          )}
        </div>
      </div>

      {/* Bottom Nav (mobile only) */}
      <div className="bottom-nav">
        {NAV_ITEMS.map(item => (
          <button key={item.key} onClick={() => setTab(item.key)}>
            {item.icon(tab === item.key)}
            <span className="bottom-nav-label" style={{ color: tab === item.key ? "#00C853" : "#8e8e93" }}>{item.label}</span>
          </button>
        ))}
      </div>

      {showWithdraw && <WithdrawModal user={user} token={token} onClose={() => setShowWithdraw(false)} onSuccess={() => { setShowWithdraw(false); fetchAll(); }} />}
    </div>
  );
}

function WithdrawModal({ user, token, onClose, onSuccess }: { user: UserInfo; token: string; onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"bkash" | "nagad" | "bank" | "">("");
  const [form, setForm] = useState({ accountNumber: "", accountName: "", bankName: "", routingNumber: "", district: "", upazila: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const amt = parseFloat(amount) || 0;
  const bdtAmt = Math.round(amt * user.bdtRate);

  async function submit() {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/dashboard/withdraw", {
        method: "POST", headers: { "Content-Type": "application/json", "x-user-token": token },
        body: JSON.stringify({ amountUsd: amount, method, ...form }),
      });
      const d = await r.json() as { error?: string };
      if (!r.ok) throw new Error(d.error ?? "Failed");
      onSuccess();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>Withdraw</h2>
          <button onClick={onClose} style={{ background: "var(--surface-alt)", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ background: "var(--primary-soft)", borderRadius: 14, padding: 14, marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Available Balance</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "var(--primary)", marginBottom: 2 }}>${user.balance.toFixed(2)}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>≈ ৳{Math.round(user.balance * user.bdtRate).toLocaleString()} @ ৳{user.bdtRate}/$</p>
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="field">
              <label className="field-label">AMOUNT (USD)</label>
              <input className="input" type="number" placeholder="Min $10" value={amount} onChange={e => setAmount(e.target.value)} />
              {amt > 0 && <p className="hint">≈ ৳{bdtAmt.toLocaleString()} BDT</p>}
            </div>
            <div>
              <label className="field-label" style={{ display: "block", marginBottom: 8 }}>PAYMENT METHOD</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(["bkash", "nagad"] as const).map(m => (
                  <button key={m} onClick={() => setMethod(m)}
                    style={{ background: method === m ? "var(--primary-soft)" : "var(--surface-alt)", border: `2px solid ${method === m ? "var(--primary)" : "transparent"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: 600, color: "var(--text)" }}>
                    {m.toUpperCase()}
                  </button>
                ))}
                <button onClick={() => amt >= 250 ? setMethod("bank") : setError("Bank requires minimum $250")}
                  style={{ background: method === "bank" ? "var(--primary-soft)" : "var(--surface-alt)", border: `2px solid ${method === "bank" ? "var(--primary)" : "transparent"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: 600, color: amt >= 250 ? "var(--text)" : "var(--text-muted)" }}>
                  Bank Transfer <span style={{ fontSize: 12 }}>(min $250)</span>
                </button>
              </div>
            </div>
            {error && <p className="error-text">{error}</p>}
            <button onClick={() => {
              if (!amt || amt < 10) { setError("Minimum $10"); return; }
              if (amt > user.balance) { setError("Insufficient balance"); return; }
              if (!method) { setError("Select method"); return; }
              setError(""); setStep(2);
            }} className="btn btn-primary btn-block">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(method === "bkash" || method === "nagad") && (
              <div className="field"><label className="field-label">ACCOUNT NUMBER</label><input className="input" type="tel" placeholder="01XXXXXXXXX" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
            )}
            {method === "bank" && <>
              <div className="field"><label className="field-label">ACCOUNT HOLDER NAME</label><input className="input" type="text" value={form.accountName} onChange={e => setForm(p => ({ ...p, accountName: e.target.value }))} /></div>
              <div className="field"><label className="field-label">ACCOUNT NUMBER</label><input className="input" type="text" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
              <div className="field"><label className="field-label">BANK NAME</label><input className="input" type="text" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} /></div>
              <div className="field"><label className="field-label">ROUTING NUMBER</label><input className="input" type="text" value={form.routingNumber} onChange={e => setForm(p => ({ ...p, routingNumber: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className="field"><label className="field-label">DISTRICT</label><input className="input" type="text" value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} /></div>
                <div className="field"><label className="field-label">UPAZILA</label><input className="input" type="text" value={form.upazila} onChange={e => setForm(p => ({ ...p, upazila: e.target.value }))} /></div>
              </div>
            </>}
            <div style={{ background: "var(--surface-alt)", borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Summary</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 2 }}>${amt.toFixed(2)} ≈ ৳{bdtAmt.toLocaleString()}</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{method.toUpperCase()}</p>
            </div>
            {error && <p className="error-text">{error}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setStep(1)} className="btn btn-muted">Back</button>
              <button onClick={submit} disabled={loading} className={`btn ${loading ? "btn-disabled-look" : "btn-primary"}`} style={{ color: "#fff" }}>
                {loading ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ token, user, onUpdate, onLogout, withdrawals, onWithdraw }: {
  token: string; user: UserInfo; onUpdate: () => void; onLogout: () => void;
  withdrawals: Withdrawal[]; onWithdraw: () => void;
}) {
  const [form, setForm] = useState({ displayName: user.displayName, username: user.username, currentPassword: "", newPassword: "", profilePic: user.profilePic ?? "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showContact, setShowContact] = useState(false);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const url = await fileToDataUrl(file); setForm(p => ({ ...p, profilePic: url })); }
    catch { setMsg("Couldn't read that image"); }
    e.target.value = "";
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMsg("");
    const r = await fetch("/api/dashboard/settings", {
      method: "PUT", headers: { "Content-Type": "application/json", "x-user-token": token },
      body: JSON.stringify(form),
    });
    const d = await r.json() as { error?: string };
    setSaving(false); setMsg(r.ok ? "✓ Saved!" : d.error ?? "Failed");
    if (r.ok) onUpdate();
  }

  return (
    <div>
      <div className="mobile-topbar"><h1>Settings</h1></div>
      <div className="section-stack two-col">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {msg && <div style={{ background: msg.startsWith("✓") ? "var(--primary-soft)" : "var(--danger-soft)", borderRadius: 12, padding: "10px 14px", color: msg.startsWith("✓") ? "var(--primary-dark)" : "var(--danger)", fontSize: 13, fontWeight: 600 }}>{msg}</div>}

          <form onSubmit={save} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>Profile</p>
            <label className="avatar-upload">
              <Avatar name={form.displayName || user.displayName} img={form.profilePic || null} seed={user.username} size={72} />
              <span className="avatar-upload-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </span>
              <input type="file" accept="image/*" onChange={onPickPhoto} />
            </label>
            <div className="field"><label className="field-label">Display Name</label><input className="input" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} /></div>
            <div className="field">
              <label className="field-label">Username</label>
              <input className="input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))} />
              <p className="hint">pay-cash.shop/pay/{form.username}</p>
            </div>
            <div className="field"><label className="field-label">Current Password (required)</label><input className="input" type="password" value={form.currentPassword} onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))} required /></div>
            <div className="field"><label className="field-label">New Password (optional)</label><input className="input" type="password" placeholder="Leave blank to keep" value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))} /></div>
            <button type="submit" disabled={saving} className={`btn ${saving ? "btn-disabled-look" : "btn-primary"}`} style={{ color: "#fff" }}>
              {saving ? "Saving…" : "Save Settings"}
            </button>
          </form>

          <button onClick={onLogout} className="card btn" style={{ color: "var(--danger)", boxShadow: "var(--shadow-sm)", padding: "15px 0" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign Out
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Withdrawal history */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 700 }}>Withdrawals</p>
              <button onClick={onWithdraw} className="btn btn-primary btn-pill btn-sm">+ New</button>
            </div>
            {withdrawals.length === 0
              ? <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", padding: "8px 0" }}>No withdrawals yet</p>
              : withdrawals.slice(0, 5).map(w => (
                <div key={w.id} className="list-row">
                  <div>
                    <p className="row-title">${w.amountUsd.toFixed(2)}</p>
                    <p className="row-sub">{w.method.toUpperCase()} · {new Date(w.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className="badge" style={{
                    color: w.status === "paid" ? "var(--primary-dark)" : w.status === "rejected" ? "var(--danger)" : "#b45309",
                    background: w.status === "paid" ? "var(--primary-soft)" : w.status === "rejected" ? "var(--danger-soft)" : "var(--warning-soft)",
                  }}>
                    {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                  </span>
                </div>
              ))}
          </div>

          <button onClick={() => setShowContact(!showContact)} className="card btn"
            style={{ padding: 16, boxShadow: "var(--shadow-sm)", justifyContent: "space-between", color: "var(--text)" }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Contact Admin</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          {showContact && (
            <div className="card" style={{ padding: 16, marginTop: -10, display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 14 }}><a href="https://www.facebook.com/h3llohasan" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Facebook — h3llohasan</a></p>
              <p style={{ fontSize: 14 }}><a href="https://t.me/hasanmahmud_dev" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Telegram — @hasanmahmud_dev</a></p>
              <p style={{ fontSize: 14 }}>Email — hasanmahmud6634@gmail.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
