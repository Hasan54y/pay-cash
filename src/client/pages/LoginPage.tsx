import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

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

  const iStyle: React.CSSProperties = { width: "100%", background: "#f5f5f7", border: "none", borderRadius: 12, color: "#111", fontSize: 15, padding: "14px 16px", outline: "none" };

  return (
    <div style={{ background: "#f5f5f7", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "36px 28px", width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <img src="/cashapp-logo.png" width={60} height={60} alt="" style={{ borderRadius: 14, margin: "0 auto 16px", display: "block" }} />
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111", marginBottom: 4 }}>Login</h1>
        <p style={{ color: "#888", fontSize: 14, marginBottom: 28 }}>Pay Cash Sub-Admin</p>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
          <input style={iStyle} type="text" placeholder="Username or Email" value={form.usernameOrEmail}
            onChange={e => setForm(p => ({ ...p, usernameOrEmail: e.target.value }))} required />
          <input style={iStyle} type="password" placeholder="Password" value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
          {error && <p style={{ color: "#ff3b30", fontSize: 13 }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ background: loading ? "#8e8e93" : "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
        <p style={{ marginTop: 20, fontSize: 14, color: "#888" }}>
          Don't have an account? <Link to="/signup" style={{ color: "#00C853", fontWeight: 600, textDecoration: "none" }}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
