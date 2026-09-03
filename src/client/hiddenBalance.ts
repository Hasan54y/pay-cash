import { useState } from "react";

export function useHiddenBalance() {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem("hide_balance") === "true"; } catch { return false; }
  });
  function toggle() {
    setHidden(prev => {
      const next = !prev;
      try { localStorage.setItem("hide_balance", String(next)); } catch { /**/ }
      return next;
    });
  }
  return { hidden, toggle };
}
