import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ThemeToggle from "./../theme";

export default function LoginPage() {
  const [form, setForm] = useState({ usernameOrEmail: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json() as { token?: string; role?: string; error?: string };
      if (!r.ok) throw new Error(d.error ?? "Login failed");
      localStorage.setItem("user_token", d.token!);
      localStorage.setItem("user_role", d.role!);
      navigate("/dashboard");
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }

  return (
    <div className="auth-page">
      <ThemeToggle />
      <div className="auth-visual">
        <div className="auth-visual-brand">
          <img src="/cashapp-logo.png" alt="" />
          <span>Pay Cash</span>
        </div>
        <div className="auth-visual-copy">
          <h2>Manage your Cash App payments in one place.</h2>
          <p>Track incoming payments, generate QR pay pages, and withdraw your balance — all from a single dashboard.</p>
        </div>
        <div className="auth-visual-foot">Sub-admin access · Pay Cash</div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">
          <img className="logo" src="/cashapp-logo.png" alt="" />
          <h1>Login</h1>
          <p className="subtitle">Pay Cash Sub-Admin</p>
          <form onSubmit={handleSubmit} className="auth-form">
            <input className="input" type="text" placeholder="Username or Email" value={form.usernameOrEmail}
              onChange={e => setForm(p => ({ ...p, usernameOrEmail: e.target.value }))} required />
            <input className="input" type="password" placeholder="Password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
            {error && <p className="error-text">{error}</p>}
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>
          <p className="auth-foot">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
