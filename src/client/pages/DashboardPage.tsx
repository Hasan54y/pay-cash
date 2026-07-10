import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import QRCanvas from "./../QRCanvas";
import { downloadQRCard } from "./../qrRenderer";

type Tab = "home" | "withdrawals" | "settings";

interface UserInfo { id: string; fullName: string; displayName: string; username: string; email: string; phone: string; balance: number; bdtRate: number; }
interface Payment { id: string; shortId: string; amountUsd: number; status: string; createdAt: string; paidAt: string | null; checkedBy: string | null; }
interface Withdrawal { id: string; amountUsd: number; method: string; status: string; createdAt: string; }

export default function DashboardPage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("user_token") ?? "";
  const [user, setUser] = useState<UserInfo | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<Tab>("home");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchUser(); fetchPayments(); fetchWithdrawals();
  }, []);

  async function fetchUser() {
    const r = await fetch("/api/dashboard/me", { headers: { "x-user-token": token } });
    if (!r.ok) { navigate("/login"); return; }
    setUser(await r.json());
  }
  async function fetchPayments() {
    const r = await fetch("/api/dashboard/payments", { headers: { "x-user-token": token } });
    if (r.ok) setPayments(await r.json());
  }
  async function fetchWithdrawals() {
    const r = await fetch("/api/dashboard/withdrawals", { headers: { "x-user-token": token } });
    if (r.ok) setWithdrawals(await r.json());
  }

  if (!user) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#f5f5f7" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 32, height: 32, border: "3px solid #00C853", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
    </div>
  );

  const payLink = `https://pay-cash.shop/pay/${user.username}`;
  const bdtBalance = (user.balance * user.bdtRate).toFixed(0);

  function logout() { localStorage.removeItem("user_token"); localStorage.removeItem("user_role"); navigate("/login"); }

  const statusColor: Record<string, string> = { paid: "#00C853", pending: "#ff9500", expired: "rgba(0,0,0,0.4)" };
  const statusBg: Record<string, string> = { paid: "#e8faf0", pending: "#fff9f0", expired: "rgba(0,0,0,0.06)" };
  const statusLabel: Record<string, string> = { paid: "Completed", pending: "Pending", expired: "Expired" };

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100dvh", fontFamily: "-apple-system, sans-serif", paddingBottom: 80 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 500, margin: "0 auto" }}>

        {tab === "home" && (
          <div>
            {/* Header */}
            <div style={{ background: "#1c2333", padding: "52px 20px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src="/cashapp-logo.png" width={36} height={36} style={{ borderRadius: 9 }} alt="" />
                  <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{user.displayName}</span>
                </div>
                <span style={{ background: "rgba(0,200,83,0.15)", border: "1px solid rgba(0,200,83,0.4)", borderRadius: 20, padding: "5px 12px", fontSize: 13, fontWeight: 600, color: "#00C853", display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, background: "#00C853", borderRadius: "50%", display: "inline-block" }} />Live
                </span>
              </div>
              {/* Balance */}
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>Present Balance</p>
                <p style={{ fontSize: 36, fontWeight: 900, color: "#00C853", margin: "0 0 4px" }}>${user.balance.toFixed(2)}</p>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", margin: "0 0 16px" }}>≈ ৳{parseInt(bdtBalance).toLocaleString()} BDT <span style={{ fontSize: 12 }}>@ ৳{user.bdtRate}/$</span></p>
                <button onClick={() => setShowWithdraw(true)}
                  style={{ background: "#00C853", border: "none", borderRadius: 50, color: "#fff", fontSize: 15, fontWeight: 700, padding: "12px 32px", cursor: "pointer" }}>
                  💸 Withdraw
                </button>
              </div>
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Payment Link QR */}
              <div style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#8e8e93", textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Your Payment Link</p>
                <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>
                  <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 8, flexShrink: 0 }}>
                    <QRCanvas data={payLink} size={120} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
                    <p style={{ fontSize: 12, color: "#888", wordBreak: "break-all", margin: 0 }}>pay-cash.shop/pay/{user.username}</p>
                    <button onClick={() => { navigator.clipboard.writeText(payLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      style={{ background: "#111", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer" }}>
                      {copied ? "✓ Copied!" : "📋 Copy Link"}
                    </button>
                    <button onClick={() => downloadQRCard(payLink, user.displayName)}
                      style={{ background: "#f5f5f7", border: "none", borderRadius: 10, color: "#111", fontSize: 13, fontWeight: 700, padding: "10px 0", cursor: "pointer" }}>
                      ↓ Download QR
                    </button>
                  </div>
                </div>
              </div>

              {/* Last 10 transactions */}
              <div style={{ background: "#fff", borderRadius: 20, padding: 16 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 12px" }}>Recent Transactions</p>
                {payments.length === 0
                  ? <p style={{ color: "#8e8e93", textAlign: "center", padding: "16px 0", fontSize: 14 }}>No transactions yet</p>
                  : payments.map(p => (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #f5f5f7" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: statusBg[p.status] ?? "#f5f5f7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                          {p.status === "paid" ? "✓" : p.status === "expired" ? "✕" : "⏳"}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#111", margin: "0 0 2px" }}>${p.amountUsd.toFixed(2)}</p>
                          <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>
                            {new Date(p.paidAt ?? p.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {p.checkedBy && <span style={{ fontSize: 11, color: "#00C853" }}>✓</span>}
                        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor[p.status], background: statusBg[p.status], borderRadius: 20, padding: "3px 10px" }}>
                          {statusLabel[p.status] ?? p.status}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === "withdrawals" && (
          <div>
            <div style={{ background: "#fff", padding: "52px 20px 16px", borderBottom: "1px solid #f0f0f0" }}>
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", margin: 0 }}>Withdrawals</h1>
            </div>
            <div style={{ padding: 16 }}>
              <button onClick={() => setShowWithdraw(true)}
                style={{ width: "100%", background: "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, padding: "14px 0", cursor: "pointer", marginBottom: 16 }}>
                + New Withdrawal
              </button>
              <div style={{ background: "#fff", borderRadius: 20, padding: "4px 16px" }}>
                {withdrawals.length === 0
                  ? <p style={{ color: "#8e8e93", textAlign: "center", padding: "32px 0" }}>No withdrawals yet</p>
                  : withdrawals.map(w => (
                    <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f5f5f7" }}>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: "0 0 3px" }}>${w.amountUsd.toFixed(2)}</p>
                        <p style={{ fontSize: 12, color: "#8e8e93", margin: 0 }}>{w.method.toUpperCase()} · {new Date(w.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: w.status === "paid" ? "#00C853" : w.status === "rejected" ? "#ff3b30" : "#ff9500", background: w.status === "paid" ? "#e8faf0" : w.status === "rejected" ? "#fff0f0" : "#fff9f0", borderRadius: 20, padding: "3px 10px" }}>
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {tab === "settings" && (
          <SettingsTab token={token} user={user} onUpdate={fetchUser} onLogout={logout} />
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid #e5e5ea", display: "flex", zIndex: 100 }}>
        {([["home", "Home", "🏠"], ["withdrawals", "Withdraw", "💸"], ["settings", "Settings", "⚙️"]] as [Tab, string, string][]).map(([t, label, icon]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ flex: 1, background: "transparent", border: "none", padding: "10px 0 14px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: tab === t ? "#00C853" : "#8e8e93" }}>{label}</span>
          </button>
        ))}
      </div>

      {showWithdraw && <WithdrawModal user={user} token={token} onClose={() => setShowWithdraw(false)} onSuccess={() => { setShowWithdraw(false); fetchUser(); fetchWithdrawals(); }} />}
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
  const bdtAmt = (amt * user.bdtRate).toFixed(0);

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

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "24px 24px 0 0", width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto", padding: "24px 20px 40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Withdraw</h2>
          <button onClick={onClose} style={{ background: "#f5f5f7", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>
        <div style={{ background: "#f0faf4", borderRadius: 14, padding: 14, marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: "#8e8e93", margin: "0 0 4px" }}>Available Balance</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: "#00C853", margin: "0 0 2px" }}>${user.balance.toFixed(2)}</p>
          <p style={{ fontSize: 13, color: "#888", margin: 0 }}>≈ ৳{(user.balance * user.bdtRate).toLocaleString()} @ ৳{user.bdtRate}/$</p>
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>AMOUNT (USD)</label>
              <input style={iStyle} type="number" placeholder="Min $10" value={amount} min="10" max={user.balance} onChange={e => setAmount(e.target.value)} />
              {amt > 0 && <p style={{ fontSize: 12, color: "#00C853", marginTop: 4 }}>≈ ৳{parseInt(bdtAmt).toLocaleString()} BDT</p>}
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 8 }}>PAYMENT METHOD</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(["bkash", "nagad"] as const).map(m => (
                  <button key={m} onClick={() => setMethod(m)}
                    style={{ background: method === m ? "#e8faf0" : "#f5f5f7", border: `2px solid ${method === m ? "#00C853" : "transparent"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: 600, color: "#111" }}>
                    {m.toUpperCase()}
                  </button>
                ))}
                <button onClick={() => amt >= 250 ? setMethod("bank") : setError("Bank requires minimum $250")}
                  style={{ background: method === "bank" ? "#e8faf0" : "#f5f5f7", border: `2px solid ${method === "bank" ? "#00C853" : "transparent"}`, borderRadius: 12, padding: "12px 16px", cursor: "pointer", textAlign: "left", fontSize: 15, fontWeight: 600, color: amt >= 250 ? "#111" : "#8e8e93" }}>
                  Bank Transfer <span style={{ fontSize: 12, color: "#8e8e93" }}>(min $250)</span>
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
              <div>
                <label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>ACCOUNT NUMBER</label>
                <input style={iStyle} type="tel" placeholder="01XXXXXXXXX" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} />
              </div>
            )}
            {method === "bank" && (
              <>
                <div><label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>ACCOUNT HOLDER NAME</label><input style={iStyle} type="text" value={form.accountName} onChange={e => setForm(p => ({ ...p, accountName: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>ACCOUNT NUMBER</label><input style={iStyle} type="text" value={form.accountNumber} onChange={e => setForm(p => ({ ...p, accountNumber: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>BANK NAME</label><input style={iStyle} type="text" value={form.bankName} onChange={e => setForm(p => ({ ...p, bankName: e.target.value }))} /></div>
                <div><label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>ROUTING NUMBER</label><input style={iStyle} type="text" value={form.routingNumber} onChange={e => setForm(p => ({ ...p, routingNumber: e.target.value }))} /></div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>DISTRICT</label><input style={iStyle} type="text" value={form.district} onChange={e => setForm(p => ({ ...p, district: e.target.value }))} /></div>
                  <div><label style={{ fontSize: 12, color: "#8e8e93", fontWeight: 600, display: "block", marginBottom: 6 }}>UPAZILA</label><input style={iStyle} type="text" value={form.upazila} onChange={e => setForm(p => ({ ...p, upazila: e.target.value }))} /></div>
                </div>
              </>
            )}
            <div style={{ background: "#f5f5f7", borderRadius: 12, padding: 14 }}>
              <p style={{ fontSize: 13, color: "#111", margin: "0 0 4px", fontWeight: 600 }}>Summary</p>
              <p style={{ fontSize: 13, color: "#888", margin: "0 0 2px" }}>Amount: ${amt.toFixed(2)} (≈ ৳{parseInt(bdtAmt).toLocaleString()})</p>
              <p style={{ fontSize: 13, color: "#888", margin: 0 }}>Method: {method.toUpperCase()}</p>
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

function SettingsTab({ token, user, onUpdate, onLogout }: { token: string; user: UserInfo; onUpdate: () => void; onLogout: () => void; }) {
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
    setSaving(false);
    setMsg(r.ok ? "✓ Saved!" : d.error ?? "Failed");
    if (r.ok) { onUpdate(); }
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
        <form onSubmit={save} style={{ background: "#fff", borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111", margin: 0 }}>Profile</p>
          <div><label style={lStyle}>Display Name</label><input style={iStyle} value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} /></div>
          <div>
            <label style={lStyle}>Username (URL)</label>
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
          <span style={{ fontSize: 15, fontWeight: 700, color: "#111" }}>📞 Contact Admin</span>
          <span style={{ color: "#8e8e93" }}>{showContact ? "▾" : "›"}</span>
        </button>
        {showContact && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 16, marginTop: -10 }}>
            <p style={{ fontSize: 14, color: "#111", marginBottom: 10 }}>📘 <a href="https://www.facebook.com/h3llohasan" target="_blank" rel="noreferrer" style={{ color: "#00C853" }}>Facebook</a></p>
            <p style={{ fontSize: 14, color: "#111", marginBottom: 10 }}>✈️ <a href="https://t.me/hasanmahmud_dev" target="_blank" rel="noreferrer" style={{ color: "#00C853" }}>@hasanmahmud_dev</a></p>
            <p style={{ fontSize: 14, color: "#111" }}>📧 hasanmahmud6634@gmail.com</p>
          </div>
        )}
        <button onClick={onLogout} style={{ background: "#fff", border: "none", borderRadius: 14, color: "#ff3b30", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: "pointer" }}>Sign Out</button>
      </div>
    </div>
  );
}
