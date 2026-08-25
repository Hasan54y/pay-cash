import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import QRCanvas from "./../QRCanvas";
import { Avatar } from "./../Avatar";

interface Invoice { invoiceId: string; shortId: string; lightningInvoice: string; amountSats: number; amountUsd: number; }
interface Receipt { amountUsd: number; displayName: string; shortId: string; lightningInvoice: string; paidAt: string; }

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export default function PaymentPage() {
  const { username } = useParams<{ username: string }>();
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [amountStr, setAmountStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // The customer-facing payment page always renders in the light/white theme,
  // regardless of the visitor's system preference or a theme toggled elsewhere in the app.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/pay/${username}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { displayName: string; id?: string; profilePic?: string | null }) => {
        setDisplayName(d.displayName); setUserId(d.id ?? null); setProfilePic(d.profilePic ?? null);
      })
      .catch(() => setNotFound(true));
  }, [username]);

  useEffect(() => {
    if (displayName) document.title = `Pay ${displayName} on Cash App`;
  }, [displayName]);

  const amount = parseFloat(amountStr || "0");
  const valid = amount >= 10 && amount <= 9999;

  function pressKey(k: string) {
    setError(null);
    if (k === "⌫") { setAmountStr(s => s.slice(0, -1)); return; }
    if (amountStr.length >= 7) return;
    if (k === ".") {
      if (amountStr.includes(".")) return;
      setAmountStr(s => (s === "" ? "0." : s + "."));
      return;
    }
    const decimals = amountStr.split(".")[1];
    if (decimals && decimals.length >= 2) return;
    setAmountStr(s => (s === "0" ? k : s + k));
  }

  async function handlePay() {
    if (!valid || loading) return;
    setError(null); setLoading(true);
    // Open the tab synchronously (still inside the click's user-gesture window) so the
    // eventual CashApp redirect isn't blocked by the popup blocker once the invoice call resolves.
    const cashAppTab = window.open("", "_blank");
    try {
      const r = await fetch("/api/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_usd: amount, userId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setInvoice(d); setCountdown(600);
      if (cashAppTab) cashAppTab.location.href = `https://cash.app/launch/lightning/${d.lightningInvoice}`;
    } catch (e) {
      cashAppTab?.close();
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (!invoice?.invoiceId || receipt) return;
    const es = new EventSource(`/api/payment-status/${invoice.invoiceId}`);
    esRef.current = es;
    es.onmessage = (evt) => {
      try {
        const d = JSON.parse(evt.data);
        if (d.status === "paid") {
          setReceipt({ amountUsd: d.amountUsd ?? invoice.amountUsd, displayName, shortId: d.shortId ?? invoice.shortId, lightningInvoice: d.lightningInvoice ?? invoice.lightningInvoice, paidAt: new Date().toISOString() });
          es.close();
        }
      } catch { /**/ }
    };
    return () => { es.close(); esRef.current = null; };
  }, [invoice?.invoiceId, receipt]);

  useEffect(() => {
    if (!invoice || receipt || countdown <= 0) return;
    const t = setInterval(() => setCountdown(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [invoice, receipt, countdown]);

  function reset() { setInvoice(null); setReceipt(null); setAmountStr(""); setError(null); esRef.current?.close(); }

  if (notFound) return (
    <div className="pay-page">
      <div style={{ textAlign: "center" }}>
        <img src="/cashapp-logo.png" width={64} height={64} style={{ borderRadius: 16, display: "block", margin: "0 auto 16px" }} alt="" />
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Page not found</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>This payment page doesn't exist.</p>
      </div>
    </div>
  );

  if (receipt) return (
    <div className="pay-page">
      <div className="pay-card">
        <div style={{ height: 6, background: "var(--primary)" }} />
        <div style={{ padding: "32px 28px 28px", textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            <Avatar name={receipt.displayName} img={profilePic} seed={username ?? receipt.displayName} size={64} />
            <div style={{ position: "absolute", bottom: -4, right: -4, background: "var(--primary)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid var(--surface)" }}>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>Payment Successful</h2>
          <p style={{ fontSize: 44, fontWeight: 900, color: "var(--primary)", margin: "0 0 24px", letterSpacing: -1 }}>${receipt.amountUsd.toFixed(2)}</p>
          <div style={{ background: "var(--surface-alt)", borderRadius: 16, marginBottom: 24 }}>
            {[["To", receipt.displayName], ["Reference", receipt.shortId], ["Date", new Date(receipt.paidAt).toLocaleString()]].map(([l, v]) => (
              <div key={l} className="list-row" style={{ padding: "14px 16px" }}>
                <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{l}</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={reset} className="btn btn-primary btn-block">Send Again</button>
        </div>
      </div>
    </div>
  );

  if (invoice) return (
    <div className="pay-page">
      <div className="pay-card" style={{ maxWidth: 420, paddingBottom: 28 }}>
        <div className="pay-grabber" />
        <button onClick={reset} style={{ background: "var(--surface-alt)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", margin: "14px 0 0 20px" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div style={{ background: countdown < 60 ? "var(--danger-soft)" : "var(--warning-soft)", borderRadius: 12, padding: "10px 16px", margin: "10px 20px", textAlign: "center", color: countdown < 60 ? "var(--danger)" : "#b45309", fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
          TIME REMAINING {fmt(countdown)}
        </div>
        <div style={{ textAlign: "center", margin: "12px 0 16px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>Amount Due</p>
          <p style={{ fontSize: 52, fontWeight: 900, color: "var(--primary)", letterSpacing: -2, lineHeight: 1 }}>${invoice.amountUsd.toFixed(2)}</p>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>We opened Cash App in a new tab — scan the QR if it didn't open</p>
        </div>
        <div style={{ background: "var(--surface-alt)", borderRadius: 20, padding: 20, margin: "0 20px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--surface)", padding: 14, borderRadius: 18 }}>
            <QRCanvas data={invoice.lightningInvoice} size={220} />
          </div>
        </div>
        <div style={{ background: "var(--surface-alt)", borderRadius: 18, margin: "0 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Invoice ID</p>
              <p style={{ fontSize: 15, fontWeight: 800, fontFamily: "monospace" }}>{invoice.shortId}</p>
            </div>
            <span className="badge" style={{ border: "1.5px solid var(--warning)", color: "#b45309" }}>AWAITING</span>
          </div>
        </div>
        <button onClick={() => window.open(`https://cash.app/launch/lightning/${invoice.lightningInvoice}`, "_blank")}
          className="btn btn-primary btn-pill" style={{ width: "calc(100% - 40px)", margin: "0 20px 10px", fontSize: 17, padding: "17px 0" }}>
          <img src="/cashapp-logo.png" width={26} height={26} alt="" style={{ borderRadius: 6 }} />
          Open in Cash App
        </button>
        <button onClick={() => { navigator.clipboard.writeText(invoice.lightningInvoice); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="btn" style={{ background: "transparent", color: "var(--text)", boxShadow: "none", width: "100%" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
          {copied ? "Copied!" : "Copy Invoice"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="pay-page">
      <div className="pay-card" style={{ paddingBottom: 24 }}>
        <div className="pay-grabber" />
        <div className="send-money-head">
          <h1>Send Money</h1>
          <Avatar name={displayName || "?"} img={profilePic} seed={username ?? displayName} size={88} />
          <p className="send-money-name">{displayName || " "}</p>
        </div>

        <p className="send-money-amount">${amountStr === "" ? "0" : amountStr}</p>

        {error && <p className="error-text" style={{ textAlign: "center", margin: "0 20px 8px" }}>{error}</p>}

        <div className="keypad">
          {KEYS.map(k => (
            <button key={k} onClick={() => pressKey(k)} disabled={loading}>
              {k === "⌫"
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>
                : k}
            </button>
          ))}
        </div>

        <div style={{ padding: "8px 20px 0" }}>
          <button onClick={handlePay} disabled={!valid || loading}
            className={`btn btn-pill btn-block ${valid && !loading ? "btn-primary" : "btn-disabled-look"}`}
            style={{ color: "#fff", fontSize: 18, padding: "18px 0" }}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} />Generating…</> : "Pay"}
          </button>
          <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 12, marginTop: 12 }}>Powered by <strong style={{ color: "var(--text-muted)" }}>Cashapp</strong></p>
        </div>
      </div>
    </div>
  );
}
