import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import QRCanvas from "./../QRCanvas";

const PRESETS_TOP = [10, 20, 25];
const PRESETS_MORE = [50, 75, 100, 150, 200, 300];

interface Invoice { invoiceId: string; shortId: string; lightningInvoice: string; amountSats: number; amountUsd: number; }
interface Receipt { amountUsd: number; displayName: string; shortId: string; lightningInvoice: string; paidAt: string; }

function fmt(s: number) { return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }

export default function PaymentPage() {
  const { username } = useParams<{ username: string }>();
  const [displayName, setDisplayName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(600);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/pay/${username}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { displayName: string; id?: string }) => { setDisplayName(d.displayName); setUserId(d.id ?? null); })
      .catch(() => setNotFound(true));
  }, [username]);

  useEffect(() => {
    if (displayName) document.title = `Pay ${displayName} on Cash App`;
  }, [displayName]);

  const amount = selected ?? (custom ? parseFloat(custom) : 0);
  const valid = amount >= 10 && amount <= 9999;

  async function handlePay() {
    if (!valid || loading) return;
    setError(null); setLoading(true);
    try {
      const r = await fetch("/api/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_usd: amount, userId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setInvoice(d); setCountdown(600);
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
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

  function reset() { setInvoice(null); setReceipt(null); setSelected(null); setCustom(""); setError(null); esRef.current?.close(); }

  const ps = (amt: number): React.CSSProperties => {
    const sel = selected === amt;
    return { border: "2px solid var(--primary)", background: sel ? "var(--primary)" : "var(--surface)", color: sel ? "#fff" : "var(--text)" };
  };

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
            <img src="/cashapp-logo.png" width={64} height={64} alt="" style={{ borderRadius: 16, display: "block" }} />
            <div style={{ position: "absolute", bottom: -8, right: -8, background: "var(--primary)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Scan QR or tap the button below</p>
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
    <>
      <style>{`.fg:focus-within{border-color:var(--primary)!important}`}</style>
      <div className="pay-page">
        <div className="pay-card" style={{ paddingBottom: 32 }}>
          <div className="pay-grabber" />
          <div style={{ textAlign: "center", padding: "18px 0 10px" }}>
            <h1 style={{ fontSize: 26, fontWeight: 800 }}>{displayName ? `Pay ${displayName}` : "Pay"}</h1>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
              <span className="badge" style={{ background: "var(--primary-soft)", color: "var(--primary-soft-text)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>Secure Payment
              </span>
            </div>
          </div>
          <div style={{ background: "var(--surface-alt)", borderRadius: 16, padding: "22px 16px", textAlign: "center", margin: "0 20px 18px" }}>
            <img src="/cashapp-logo.png" width={64} height={64} alt="CashApp" style={{ borderRadius: 14, display: "block", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 17, fontWeight: 700 }}>CashApp</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Instant</p>
          </div>
          <div style={{ background: "var(--primary-soft)", borderRadius: 20, padding: "18px 16px 20px", margin: "0 20px 18px" }}>
            <p style={{ color: "var(--primary-soft-text)", fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14 }}>⊕ Select Amount</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 10 }}>
              {PRESETS_TOP.map(a => <button key={a} className="btn btn-pill" style={{ ...ps(a), padding: "12px 4px", fontSize: 15 }} onClick={() => { setSelected(a); setCustom(""); setError(null); }}>${a}</button>)}
            </div>
            <button onClick={() => setShowMore(v => !v)} className="btn btn-block" style={{ background: "#ddf2e8", color: "var(--primary-soft-text)", boxShadow: "none", padding: "10px 0", marginBottom: 10 }}>
              {showMore ? "▴ Show fewer" : "▾ Show more amounts"}
            </button>
            {showMore && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
                {PRESETS_MORE.map(a => <button key={a} className="btn btn-pill" style={{ ...ps(a), padding: "10px 4px", fontSize: 14 }} onClick={() => { setSelected(a); setCustom(""); setError(null); }}>${a}</button>)}
              </div>
            )}
            <div className="fg" style={{ background: "var(--surface)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, border: "1.5px solid transparent" }}>
              <span style={{ color: "var(--primary)", fontWeight: 700 }}>$</span>
              <input type="number" placeholder="Custom amount" value={custom}
                onChange={e => { setCustom(e.target.value.replace(/[^0-9.]/g, "")); setSelected(null); setError(null); }}
                style={{ border: "none", outline: "none", fontSize: 15, color: "var(--text-muted)", background: "transparent", width: "100%", fontFamily: "inherit" }} />
            </div>
          </div>
          {error && <p className="error-text" style={{ textAlign: "center", margin: "0 20px 10px" }}>{error}</p>}
          <button onClick={handlePay} disabled={!valid || loading}
            className={`btn btn-pill btn-block ${valid && !loading ? "btn-primary" : "btn-disabled-look"}`}
            style={{ width: "calc(100% - 40px)", margin: "0 20px 14px", color: "#fff", fontSize: 18, padding: "18px 0" }}>
            {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} />Generating…</> : "Pay Now →"}
          </button>
          <p style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 12 }}>Powered by <strong style={{ color: "var(--text-muted)" }}>Cashapp</strong></p>
        </div>
      </div>
    </>
  );
}
