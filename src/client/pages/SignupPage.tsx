import { useState } from "react";
import { Link } from "react-router-dom";

export default function SignupPage() {
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", displayName: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json() as { message?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Signup failed");
      setSuccess(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  const iStyle: React.CSSProperties = { width: "100%", background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 15, padding: "14px 16px", outline: "none" };

  if (success) return (
    <div style={{ background: "#f5f5f7", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "36px 28px", width: "100%", maxWidth: 380, textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
        <div style={{ width: 64, height: 64, background: "#e8faf0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", marginBottom: 8 }}>Request Submitted!</h2>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 8 }}>Your signup request is pending admin approval.</p>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>You can contact admin while waiting:</p>
        <div style={{ background: "#f5f5f7", borderRadius: 14, padding: 16, textAlign: "left", marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "#111", marginBottom: 8 }}>📘 <a href="https://www.facebook.com/h3llohasan" target="_blank" rel="noreferrer" style={{ color: "#00C853" }}>Facebook</a></p>
          <p style={{ fontSize: 13, color: "#111", marginBottom: 8 }}>✈️ <a href="https://t.me/hasanmahmud_dev" target="_blank" rel="noreferrer" style={{ color: "#00C853" }}>@hasanmahmud_dev</a></p>
          <p style={{ fontSize: 13, color: "#111" }}>📧 hasanmahmud6634@gmail.com</p>
        </div>
        <Link to="/login" style={{ display: "block", background: "#00C853", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "15px 0", textDecoration: "none" }}>
          Go to Login
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "36px 28px", width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <img src="/cashapp-logo.png" width={60} height={60} alt="" style={{ borderRadius: 14, margin: "0 auto 16px", display: "block" }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 28 }}>Sign Up</h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          <input style={iStyle} type="text" placeholder="Your Full Name" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required />
          <input style={iStyle} type="tel" placeholder="Phone Number" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          <input style={iStyle} type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <input style={iStyle} type="text" placeholder="Display Name (for payment page title)" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} required />
          <div>
            <input style={iStyle} type="text" placeholder="Username (for payment page URL)" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))} required />
            {form.username && <p style={{ fontSize: 12, color: "#00C853", marginTop: 4, paddingLeft: 4 }}>pay-cash.shop/pay/{form.username}</p>}
          </div>
          <input style={iStyle} type="password" placeholder="Password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
          {error && <p style={{ color: "#ff3b30", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background: loading ? "#8e8e93" : "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Submitting…" : "Sign Up"}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 14, color: "#888" }}>
          Already have an account? <Link to="/login" style={{ color: "#00C853", fontWeight: 600, textDecoration: "none" }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
