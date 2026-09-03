export function EyeToggle({ hidden, onToggle, dark }: { hidden: boolean; onToggle: () => void; dark?: boolean }) {
  return (
    <button onClick={onToggle} aria-label={hidden ? "Show balance" : "Hide balance"} title={hidden ? "Show balance" : "Hide balance"}
      style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", color: dark ? "rgba(255,255,255,0.5)" : "var(--text-muted)" }}>
      {hidden
        ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a20.29 20.29 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a20.29 20.29 0 01-3.22 4.19M14.12 14.12a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
        : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>}
    </button>
  );
}

export function maskAmount(display: string, hidden: boolean) {
  return hidden ? "••••••" : display;
}
