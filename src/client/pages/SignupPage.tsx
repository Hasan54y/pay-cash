import { useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggle from "./../theme";

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

  if (success) return (
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-visual">
        <div className="auth-visual-brand">
          <img src="/cashapp-logo.png" alt="" />
          <span>Pay Cash</span>
        </div>
        <div className="auth-visual-copy">
          <h2>You're almost in.</h2>
          <p>An admin will review your request shortly. Reach out below if you need anything in the meantime.</p>
        </div>
        <div className="auth-visual-foot">Sub-admin access · Pay Cash</div>
      </div>
      <div className="auth-form-side">
        <div className="auth-card">
          <div style={{ width: 64, height: 64, background: "var(--primary-soft)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28, color: "var(--primary-dark)" }}>✓</div>
          <h1 style={{ marginBottom: 8 }}>Request Submitted!</h1>
          <p className="subtitle" style={{ marginBottom: 8 }}>Your signup request is pending admin approval.</p>
          <p className="subtitle" style={{ marginBottom: 24 }}>You can contact admin while waiting:</p>
          <div style={{ background: "var(--surface-alt)", borderRadius: 14, padding: 16, textAlign: "left", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <p style={{ fontSize: 13, color: "var(--text)" }}>📘 <a href="https://www.facebook.com/h3llohasan" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Facebook</a></p>
            <p style={{ fontSize: 13, color: "var(--text)" }}>✈️ <a href="https://t.me/hasanmahmud_dev" target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>@hasanmahmud_dev</a></p>
            <p style={{ fontSize: 13, color: "var(--text)" }}>📧 hasanmahmud6634@gmail.com</p>
          </div>
          <Link to="/login" className="btn btn-primary btn-block">Go to Login</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-visual">
        <div className="auth-visual-brand">
          <img src="/cashapp-logo.png" alt="" />
          <span>Pay Cash</span>
        </div>
        <div className="auth-visual-copy">
          <h2>Get your own Cash App pay page in minutes.</h2>
          <p>Sign up as a sub-admin to receive instant payments, share a QR pay page, and track every transaction.</p>
        </div>
        <div className="auth-visual-foot">Sub-admin access · Pay Cash</div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <img className="logo" src="/cashapp-logo.png" alt="" />
          <h1 style={{ marginBottom: 28 }}>Sign Up</h1>
          <form onSubmit={handleSubmit} className="auth-form">
            <input className="input" type="text" placeholder="Your Full Name" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required />
            <input className="input" type="tel" placeholder="Phone Number" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            <input className="input" type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            <input className="input" type="text" placeholder="Display Name (for payment page title)" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} required />
            <div className="field">
              <input className="input" type="text" placeholder="Username (for payment page URL)" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") }))} required />
              {form.username && <p className="hint" style={{ paddingLeft: 4 }}>realcash.online/pay/{form.username}</p>}
            </div>
            <input className="input" type="password" placeholder="Password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required minLength={6} />
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Submitting…" : "Sign Up"}
            </button>
          </form>
          <p className="auth-foot">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
