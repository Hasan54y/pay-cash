import { Link } from "react-router-dom";

export function LegalFooter({ termsAudience }: { termsAudience?: "customer" }) {
  const termsHref = termsAudience === "customer" ? "/terms?audience=customer" : "/terms";
  return (
    <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 14 }}>
      <Link to={termsHref} style={{ color: "inherit" }}>Terms of Service</Link>
      {" · "}
      <Link to="/privacy" style={{ color: "inherit" }}>Privacy Policy</Link>
    </p>
  );
}
