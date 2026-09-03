import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Avatar } from "./../Avatar";

interface Invoice { invoiceId: string; shortId: string; lightningInvoice: string; amountSats: number; amountUsd: number; }
interface Receipt { amountUsd: number; displayName: string; shortId: string; lightningInvoice: string; paidAt: string; }

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

function goToCashApp(lightningInvoice: string) {
  // Same-tab, plain navigation only — no window.open, no intent:// resolver tricks,
  // so there's nothing that can spawn a new tab or a native chooser/permission prompt.
  window.location.href = `https://cash.app/launch/lightning/${lightningInvoice}`;
}

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
    if (displayName) document.title = `Enter amount and Pay ${displayName}`;
  }, [displayName]);

  const amount = parseFloat(amountStr || "0");
  const valid = amount >= 10 && amount <= 9999;
  const pending = !!invoice && !receipt;

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
    if (!valid || loading || pending) return;
    setError(null); setLoading(true);
    try {
      const r = await fetch("/api/invoices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_usd: amount, userId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Failed");
      setInvoice(d);
      // Same-tab navigation, not window.open(): in-app browsers are single-context
      // WebViews that silently block window.open(). When Cash App is installed and the
      // OS (not a restrictive host app) handles this link, it intercepts the deep link
      // before the page actually navigates away, so this page's payment-status polling
      // stays alive underneath.
      goToCashApp(d.lightningInvoice);
    } catch (e) {
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

  return (
    <div className="pay-page">
      <div className="pay-card" style={{ paddingBottom: 24 }}>
        <div className="pay-grabber" />
        <div className="send-money-head">
          <h1>Send Money</h1>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Avatar name={displayName || "?"} img={profilePic} seed={username ?? displayName} size={88} />
          </div>
          <p className="send-money-name">{displayName || " "}</p>
        </div>

        <p className="send-money-amount">${amountStr === "" ? "0" : amountStr}</p>

        {error && <p className="error-text" style={{ textAlign: "center", margin: "0 20px 8px" }}>{error}</p>}

        <div className="keypad">
          {KEYS.map(k => (
            <button key={k} onClick={() => pressKey(k)} disabled={loading || pending}>
              {k === "⌫"
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" /></svg>
                : k}
            </button>
          ))}
        </div>

        <div style={{ padding: "8px 20px 0" }}>
          <button onClick={handlePay} disabled={!valid || loading || pending}
            className={`btn btn-pill btn-block ${valid && !loading && !pending ? "btn-primary" : "btn-disabled-look"}`}
            style={{ color: "#fff", fontSize: 18, padding: "18px 0" }}>
            {loading
              ? <><div className="spinner" style={{ width: 18, height: 18 }} />Generating…</>
              : pending
                ? <><div className="spinner" style={{ width: 18, height: 18 }} />Waiting for payment…</>
                : "Pay"}
          </button>
        </div>
      </div>
    </div>
  );
}
