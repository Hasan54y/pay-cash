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
    return { border: "2px solid #00C853", background: sel ? "#00C853" : "#fff", color: sel ? "#fff" : "#111", borderRadius: 50, fontSize: 15, fontWeight: 700, padding: "12px 4px", cursor: "pointer" };
  };

  if (notFound) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100dvh", background: "#f0f0f0" }}>
      <div style={{ textAlign: "center" }}>
        <img src="/cashapp-logo.png" width={64} height={64} style={{ borderRadius: 16, display: "block", margin: "0 auto 16px" }} alt="" />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>Page not found</h2>
        <p style={{ color: "#888", marginTop: 8 }}>This payment page doesn't exist.</p>
      </div>
    </div>
  );

  if (receipt) return (
    <div style={{ background: "#f5f5f7", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 28, width: "100%", maxWidth: 400, overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.10)" }}>
        <div style={{ height: 6, background: "#00C853" }} />
        <div style={{ padding: "32px 24px 28px", textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
            <img src="/cashapp-logo.png" width={64} height={64} alt="" style={{ borderRadius: 16, display: "block" }} />
            <div style={{ position: "absolute", bottom: -8, right: -8, background: "#00C853", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: "0 0 6px" }}>Payment Successful</h2>
          <p style={{ fontSize: 42, fontWeight: 900, color: "#00C853", margin: "0 0 24px", letterSpacing: -1 }}>${receipt.amountUsd.toFixed(2)}</p>
          <div style={{ background: "#f9f9f9", borderRadius: 16, marginBottom: 24 }}>
            {[["To", receipt.displayName], ["Reference", receipt.shortId], ["Date", new Date(receipt.paidAt).toLocaleString()]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <span style={{ fontSize: 14, color: "#888" }}>{l}</span>
                <span style={{ fontSize: 14, color: "#111", fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <button onClick={reset} style={{ width: "100%", background: "#00C853", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, padding: "15px 0", cursor: "pointer" }}>
            Send Again
          </button>
        </div>
      </div>
    </div>
  );

  if (invoice) return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background: "#f0f0f0", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 28, width: "100%", maxWidth: 400, paddingBottom: 28, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", overflow: "hidden" }}>
          <div style={{ width: 40, height: 5, background: "#d1d1d6", borderRadius: 3, margin: "14px auto 0" }} />
          <button onClick={reset} style={{ background: "#f0f0f0", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", margin: "14px 0 0 20px" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <div style={{ background: countdown < 60 ? "#fff0f0" : "#fff8e6", borderRadius: 12, padding: "10px 16px", margin: "10px 20px", textAlign: "center", color: countdown < 60 ? "#ef4444" : "#d97706", fontSize: 14, fontWeight: 700, letterSpacing: 1 }}>
            TIME REMAINING {fmt(countdown)}
          </div>
          <div style={{ textAlign: "center", margin: "12px 0 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Amount Due</p>
            <p style={{ fontSize: 52, fontWeight: 900, color: "#00C853", letterSpacing: -2, lineHeight: 1 }}>${invoice.amountUsd.toFixed(2)}</p>
            <p style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Scan QR or tap the button below</p>
          </div>
          <div style={{ background: "#f7f7f7", borderRadius: 20, padding: 20, margin: "0 20px 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#fff", padding: 14, borderRadius: 18 }}>
              <QRCanvas data={invoice.lightningInvoice} size={220} />
            </div>
          </div>
          <div style={{ background: "#f7f7f7", borderRadius: 18, margin: "0 20px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Invoice ID</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#111", fontFamily: "monospace" }}>{invoice.shortId}</p>
              </div>
              <span style={{ border: "1.5px solid #d97706", borderRadius: 50, padding: "7px 14px", fontSize: 11, fontWeight: 800, color: "#d97706" }}>AWAITING</span>
            </div>
          </div>
          <button onClick={() => window.open(`https://cash.app/launch/lightning/${invoice.lightningInvoice}`, "_blank")}
            style={{ width: "calc(100% - 40px)", margin: "0 20px 10px", background: "#00C853", border: "none", borderRadius: 50, color: "#fff", fontSize: 17, fontWeight: 800, padding: "17px 0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: "0 4px 20px rgba(0,200,83,0.35)" }}>
            <img src="/cashapp-logo.png" width={26} height={26} alt="" style={{ borderRadius: 6 }} />
            Open in Cash App
          </button>
          <button onClick={() => { navigator.clipboard.writeText(invoice.lightningInvoice); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{ background: "transparent", border: "none", color: "#111", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 0", width: "100%" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
            {copied ? "Copied!" : "Copy Invoice"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .fg:focus-within{border-color:#00C853!important}`}</style>
      <div style={{ background: "#f0f0f0", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 28, width: "100%", maxWidth: 400, paddingBottom: 32, boxShadow: "0 8px 40px rgba(0,0,0,0.10)", overflow: "hidden" }}>
          <div style={{ width: 40, height: 5, background: "#d1d1d6", borderRadius: 3, margin: "14px auto 0" }} />
          <div style={{ textAlign: "center", padding: "18px 0 10px" }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#111" }}>{displayName ? `Pay ${displayName}` : "Pay"}</h1>
            <div style={{ display: "flex", justifyContent: "center", marginTop: 6 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#e6f9ee", color: "#00a652", fontSize: 13, fontWeight: 600, borderRadius: 20, padding: "4px 12px" }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>Secure Payment
              </span>
            </div>
          </div>
          <div style={{ background: "#f7f7f7", borderRadius: 16, padding: "22px 16px", textAlign: "center", margin: "0 20px 18px" }}>
            <img src="/cashapp-logo.png" width={64} height={64} alt="CashApp" style={{ borderRadius: 14, display: "block", margin: "0 auto 10px" }} />
            <p style={{ fontSize: 17, fontWeight: 700, color: "#111" }}>CashApp</p>
            <p style={{ fontSize: 13, color: "#888", marginTop: 2 }}>Instant</p>
          </div>
          <div style={{ background: "#f0faf4", borderRadius: 20, padding: "18px 16px 20px", margin: "0 20px 18px" }}>
            <p style={{ color: "#00a652", fontSize: 12, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 14 }}>⊕ Select Amount</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 10 }}>
              {PRESETS_TOP.map(a => <button key={a} style={ps(a)} onClick={() => { setSelected(a); setCustom(""); setError(null); }}>${a}</button>)}
            </div>
            <button onClick={() => setShowMore(v => !v)} style={{ width: "100%", background: "#ddf2e8", border: "none", borderRadius: 12, color: "#00a652", fontSize: 14, fontWeight: 600, padding: "10px 0", cursor: "pointer", marginBottom: 10 }}>
              {showMore ? "▴ Show fewer" : "▾ Show more amounts"}
            </button>
            {showMore && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
                {PRESETS_MORE.map(a => <button key={a} style={{ ...ps(a), padding: "10px 4px", fontSize: 14 }} onClick={() => { setSelected(a); setCustom(""); setError(null); }}>${a}</button>)}
              </div>
            )}
            <div className="fg" style={{ background: "#fff", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8, border: "1.5px solid transparent" }}>
              <span style={{ color: "#00C853", fontWeight: 700 }}>$</span>
              <input type="number" placeholder="Custom amount" value={custom}
                onChange={e => { setCustom(e.target.value.replace(/[^0-9.]/g, "")); setSelected(null); setError(null); }}
                style={{ border: "none", outline: "none", fontSize: 15, color: "#888", background: "transparent", width: "100%", fontFamily: "inherit" }} />
            </div>
          </div>
          {error && <p style={{ color: "#ef4444", fontSize: 13, textAlign: "center", margin: "0 20px 10px" }}>{error}</p>}
          <button onClick={handlePay} disabled={!valid || loading}
            style={{ width: "calc(100% - 40px)", margin: "0 20px 14px", background: valid && !loading ? "#00C853" : "#aaa", border: "none", borderRadius: 50, color: "#fff", fontSize: 18, fontWeight: 700, padding: "18px 0", cursor: valid && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {loading ? <><div style={{ width: 18, height: 18, border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Generating…</> : "Pay Now →"}
          </button>
          <p style={{ textAlign: "center", color: "#aaa", fontSize: 12 }}>Powered by <strong style={{ color: "#555" }}>Cashapp</strong></p>
        </div>
      </div>
    </>
  );
}
