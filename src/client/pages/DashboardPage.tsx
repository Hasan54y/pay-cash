import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import QRCanvas from "./../QRCanvas";
import { downloadQRCard } from "./../qrRenderer";
import { registerPush } from "./../push";

type Tab = "home" | "payments" | "paypage" | "settings";

interface UserInfo { id: string; fullName: string; displayName: string; username: string; email: string; phone: string; balance: number; bdtRate: number; }
interface Payment { id: string; shortId: string; amountUsd: number; amountSats: number; status: string; createdAt: string; paidAt: string | null; checkedBy: string | null; lightningInvoice: string; }
interface Withdrawal { id: string; amountUsd: number; method: string; status: string; createdAt: string; }
interface DashboardData { payments: Payment[]; totalRevenue: number; }

// Vector Icons
function IconHome({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>;
}
function IconCard({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;
}
function IconQR({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/><line x1="19" y1="14" x2="19" y2="14"/><line x1="19" y1="19" x2="21" y2="19"/><line x1="21" y1="14" x2="21" y2="17"/></svg>;
}
function IconSettings({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
}
function IconWithdraw({ active }: { active: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#00C853" : "#8e8e93"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("user_token") ?? "";
  const [user, setUser] = useState<UserInfo | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [showWithdraw, setShowWithdraw] = useState(false);

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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#f5f5f7" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, border: "3px solid #00C853", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
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

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100dvh", fontFamily: "-apple-system, sans-serif", paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>

        {/* HOME TAB */}
        {tab === "home" && (
          <div>
            <div style={{ background: "#1c2333", padding: "52px 20px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src="/cashapp-logo.png" width={34} height={34} style={{ borderRadius: 8 }} alt="" />
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{user.displayName}</span>
                </div>
                <span style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.4)", borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 600, color: "#00C853", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, background: "#00C853", borderRadius: "50%", display: "inline-block" }} />Live
                </span>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>Present Balance</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: "#00C853", margin: "0 0 2px" }}>${user.balance.toFixed(2)}</p>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 16px" }}>≈ ৳{Math.round(user.balance * user.bdtRate).toLocaleString()} <span style={{ fontSize: 12 }}>@ ৳{user.bdtRate}/$</span></p>
                <button onClick={() => setShowWithdraw(true)}
                  style={{ background: "#00C853", border: "none", borderRadius: 50, color: "#fff", fontSize: 14, fontWeight: 700, padding: "11px 28px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <IconWithdraw active={true} /> Withdraw
                </button>
              </div>
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ background: "#fff", borderRadius: 16, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Today</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 2px" }}>${todayTotal.toFixed(2)}</p>
                  <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{todayPaid.length} paid</p>
                </div>
                <div style={{ background: "#fff", borderRadius: 16, padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 6px" }}>Total</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: "#111", margin: "0 0 2px" }}>${totalRevenue.toFixed(2)}</p>
                  <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{paid.length} payments</p>
                </div>
              </div>

              {/* Recent 10 transactions */}
              <div style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>Recent Transactions</p>
                {payments.slice(0, 10).length === 0
                  ? <p style={{ color: "#8e8e93", textAlign: "center", padding: "16px 0", fontSize: 14 }}>No transactions yet</p>
                  : payments.filter(p => !(p.status === "expired" && Date.now() - new Date(p.createdAt).getTime() > 600000)).slice(0, 10).map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f5f5f7" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: sb[p.status] ?? "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {p.status === "paid"
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : p.status === "expired"
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>${p.amountUsd.toFixed(2)}</p>
                          <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{new Date(p.paidAt ?? p.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {p.checkedBy && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        <span style={{ fontSize: 12, fontWeight: 600, color: sc[p.status], background: sb[p.status], borderRadius: 20, padding: "3px 10px" }}>{sl[p.status] ?? p.status}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* PAYMENTS TAB */}
        {tab === "payments" && (
          <div>
            <div style={{ background: "#fff", padding: "52px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>All Payments</h1>
            </div>
            <div style={{ padding: 16 }}>
              {payments.length === 0
                ? <div style={{ background: "#fff", borderRadius: 20, padding: 40, textAlign: "center" }}><p style={{ color: "#8e8e93" }}>No payments yet</p></div>
                : <div style={{ background: "#fff", borderRadius: 20, padding: "4px 16px" }}>
                  {payments.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f5f5f7" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: sb[p.status] ?? "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {p.status === "paid"
                            ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            : p.status === "expired"
                              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff9500" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>${p.amountUsd.toFixed(2)}</p>
                          <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{new Date(p.paidAt ?? p.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {p.checkedBy && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        <span style={{ fontSize: 12, fontWeight: 600, color: sc[p.status], background: sb[p.status], borderRadius: 20, padding: "3px 10px" }}>{sl[p.status] ?? p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>}
            </div>
          </div>
        )}

        {/* PAYMENT PAGE TAB */}
        {tab === "paypage" && (
          <div>
            <div style={{ background: "#fff", padding: "52px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>Payment Page</h1>
            </div>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* QR Card */}
              <div style={{ background: "#fff", borderRadius: 20, padding: 20 }}>
                <p style={{ fontSize: 13, color: "#8e8e93", textAlign: "center", margin: "0 0 16px" }}>Scan to pay with cash app</p>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                  <div style={{ background: "#f5f5f7", borderRadius: 20, padding: 16 }}>
                    <QRCanvas data={payLink} size={200} />
                  </div>
                </div>
                <p style={{ fontSize: 20, fontWeight: 900, color: "#000", textAlign: "center", margin: "0 0 16px", fontFamily: "Arial Black, Arial, sans-serif" }}>{user.displayName}</p>
                <p style={{ fontSize: 13, color: "#8e8e93", textAlign: "center", margin: "0 0 16px" }}>pay-cash.shop/pay/{user.username}</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => { navigator.clipboard.writeText(payLink); }}
                    style={{ flex: 1, background: "#111", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700, padding: "13px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                    Copy Link
                  </button>
                  <button onClick={() => downloadQRCard(payLink, user.displayName)}
                    style={{ flex: 1, background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 14, fontWeight: 700, padding: "13px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download QR
                  </button>
                </div>
              </div>

              {/* Open payment page */}
              <a href={payLink} target="_blank" rel="noreferrer"
                style={{ background: "#fff", borderRadius: 16, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", textDecoration: "none" }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>Open Payment Page</p>
                  <p style={{ fontSize: 13, color: "#8e8e93", margin: 0 }}>pay-cash.shop/pay/{user.username}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === "settings" && (
          <SettingsTab token={token} user={user} onUpdate={fetchAll} onLogout={logout} withdrawals={withdrawals} onWithdraw={() => setShowWithdraw(true)} />
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid #e5e5ea", display: "flex", zIndex: 100 }}>
        {([
          ["home", "Home", <IconHome active={tab === "home"} />],
          ["payments", "Payments", <IconCard active={tab === "payments"} />],
          ["paypage", "Pay Page", <IconQR active={tab === "paypage"} />],
          ["settings", "Settings", <IconSettings active={tab === "settings"} />],
        ] as [Tab, string, React.ReactNode][]).map(([t, label, icon]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, background: "transparent", border: "none", padding: "10px 0 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            {icon}
            <span style={{ fontSize: 10, fontWeight: 600, color: tab === t ? "#00C853" : "#8e8e93" }}>{label}</span>
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

  const iStyle: React.CSSProperties = { width: "100%", background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 15, padding: "13px 16px", outline: "none" };
  const lStyle: React.CSSProperties = { fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Withdraw</h2>
          <button onClick={onClose} style={{ background: "#f5f5f7", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ background: "#f0faf4", borderRadius: 14, padding: 14, marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: "#8e8e93", margin: "0 0 4px" }}>Available Balance</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#00C853", margin: "0 0 2px" }}>${user.balance.toFixed(2)}</p>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>≈ ৳{Math.round(user.balance * user.bdtRate).toLocaleString()} @ ৳{user.bdtRate}/$</p>
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={lStyle}>AMOUNT (USD)</label>
              <input style={iStyle} type="number" placeholder="Min $10" value={amount} onChange={e => setAmount(e.target.value)} />
              {amt > 0 && <p style={{ fontSize: 12, color: "#00C853", marginTop: 4 }}>≈ ৳{bdtAmt.toLocaleString()} BDT</p>}
            </div>
            <div>
              <label style={lStyle}>PAYMENT METHOD</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(["bkash", "nagad"] as const).map(m => (
                  <button key={m} onClick={() => setMethod(m)}
                    style={{ background: method === m ? "#e8faf0" : "#f5f5f7", border: `2px solid ${method === m ? "#00C853" : "transparent"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: 600, color: "#111" }}>
                    {m.toUpperCase()}
                  </button>
                ))}
                <button onClick={() => amt >= 250 ? setMethod("bank") : setError("Bank requires minimum $250")}
                  style={{ background: method === "bank" ? "#e8faf0" : "#f5f5f7", border: `2px solid ${method === "bank" ? "#00C853" : "transparent"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: 600, color: amt >= 250 ? "#111" : "#8e8e93" }}>
                  Bank Transfer <span style={{ fontSize: 12 }}>(min $250)</span>
                </button>
              </div>
            </div>
            {error && <p style={{ color: "#ff3b30", fontSize: 13 }}>{error}</p>}
            <button onClick={() => {
              if (!amt || amt < 10) { setError("Minimum $10"); return; }
              if (amt > user.balance) { setError("Insufficient balance"); return; }
              if (!method) { setError("Select method"); return; }
              setError(""); setStep(2);
            }} style={{ background: "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: "pointer" }}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {(method === "bkash" || method === "nagad") && (
              <div><label style={lStyle}>ACCOUNT NUMBER</label><input style={iStyle} type="tel" placeholder="01XXXXXXXXX" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
            )}
            {method === "bank" && <>
              <div><label style={lStyle}>ACCOUNT HOLDER NAME</label><input style={iStyle} type="text" value={form.accountName} onChange={e => setForm(p => ({ ...p, accountName: e.target.value }))} /></div>
              <div><label style={lStyle}>ACCOUNT NUMBER</label><input style={iStyle} type="text" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
              <div><label style={lStyle}>BANK NAME</label><input style={iStyle} type="text" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} /></div>
              <div><label style={lStyle}>ROUTING NUMBER</label><input style={iStyle} type="text" value={form.routingNumber} onChange={e => setForm(p => ({ ...p, routingNumber: e.target.value }))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lStyle}>DISTRICT</label><input style={iStyle} type="text" value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} /></div>
                <div><label style={lStyle}>UPAZILA</label><input style={iStyle} type="text" value={form.upazila} onChange={e => setForm(p => ({ ...p, upazila: e.target.value }))} /></div>
              </div>
            </>}
            <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#111", margin: "0 0 4px" }}>Summary</p>
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 2px" }}>${amt.toFixed(2)} ≈ ৳{bdtAmt.toLocaleString()}</p>
              <p style={{ fontSize: 13, color: "#888", margin: 0 }}>{method.toUpperCase()}</p>
            </div>
            {error && <p style={{ color: "#ff3b30", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ background: "#f5f5f7", border: "none", borderRadius: 14, color: "#111", fontSize: 15, fontWeight: 700, padding: "14px 0", cursor: "pointer" }}>Back</button>
              <button onClick={submit} disabled={loading} style={{ background: loading ? "#8e8e93" : "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, padding: "14px 0", cursor: loading ? "not-allowed" : "pointer" }}>
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
  const [form, setForm] = useState({ displayName: user.displayName, username: user.username, currentPassword: "", newPassword: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showContact, setShowContact] = useState(false);

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

  const iStyle: React.CSSProperties = { width: "100%", background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 15, padding: "14px 16px", outline: "none" };
  const lStyle: React.CSSProperties = { fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 };

  return (
    <div>
      <div style={{ background: "#fff", padding: "52px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>Settings</h1>
      </div>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {msg && <div style={{ background: msg.startsWith("✓") ? "#e8faf0" : "#fff0f0", borderRadius: 12, padding: "10px 14px", color: msg.startsWith("✓") ? "#00C853" : "#ff3b30", fontSize: 13, fontWeight: 600 }}>{msg}</div>}

        {/* Withdrawal history */}
        <div style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>Withdrawals</p>
            <button onClick={onWithdraw} style={{ background: "#00C853", border: "none", borderRadius: 20, color: "#fff", fontSize: 13, fontWeight: 700, padding: "7px 16px", cursor: "pointer" }}>+ New</button>
          </div>
          {withdrawals.length === 0
            ? <p style={{ color: "#8e8e93", fontSize: 13, textAlign: "center", padding: "8px 0" }}>No withdrawals yet</p>
            : withdrawals.slice(0, 5).map(w => (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #f5f5f7" }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>${w.amountUsd.toFixed(2)}</p>
                  <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{w.method.toUpperCase()} · {new Date(w.createdAt).toLocaleDateString()}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: w.status === "paid" ? "#00C853" : w.status === "rejected" ? "#ff3b30" : "#ff9500", background: w.status === "paid" ? "#e8faf0" : w.status === "rejected" ? "#fff0f0" : "#fff9f0", borderRadius: 20, padding: "3px 10px", alignSelf: "center" }}>
                  {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                </span>
              </div>
            ))}
        </div>

        <form onSubmit={save} style={{ background: "#fff", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>Profile</p>
          <div><label style={lStyle}>Display Name</label><input style={iStyle} value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} /></div>
          <div>
            <label style={lStyle}>Username</label>
            <input style={iStyle} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))} />
            <p style={{ fontSize: 12, color: "#00C853", marginTop: 4 }}>pay-cash.shop/pay/{form.username}</p>
          </div>
          <div><label style={lStyle}>Current Password (required)</label><input style={iStyle} type="password" value={form.currentPassword} onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))} required /></div>
          <div><label style={lStyle}>New Password (optional)</label><input style={iStyle} type="password" placeholder="Leave blank to keep" value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))} /></div>
          <button type="submit" disabled={saving} style={{ background: saving ? "#8e8e93" : "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "14px 0", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </form>

        <button onClick={() => setShowContact(!showContact)}
          style={{ background: "#fff", border: "none", borderRadius: 20, padding: 16, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>Contact Admin</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e93" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        {showContact && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 16, marginTop: -10 }}>
            <p style={{ fontSize: 14, color: "#111", marginBottom: 10 }}><a href="https://www.facebook.com/h3llohasan" target="_blank" rel="noreferrer" style={{ color: "#00C853" }}>Facebook — h3llohasan</a></p>
            <p style={{ fontSize: 14, color: "#111", marginBottom: 10 }}><a href="https://t.me/hasanmahmud_dev" target="_blank" rel="noreferrer" style={{ color: "#00C853" }}>Telegram — @hasanmahmud_dev</a></p>
            <p style={{ fontSize: 14, color: "#111" }}>Email — hasanmahmud6634@gmail.com</p>
          </div>
        )}

        <button onClick={onLogout} style={{ background: "#fff", border: "none", borderRadius: 14, color: "#ff3b30", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}
