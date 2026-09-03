import { Link } from "react-router-dom";

export function LegalFooter({ customer }: { customer?: boolean }) {
  const suffix = customer ? "?audience=customer" : "";
  return (
    <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 14 }}>
      <Link to={`/terms${suffix}`} style={{ color: "inherit" }}>Terms of Service</Link>
      {" · "}
      <Link to={`/privacy${suffix}`} style={{ color: "inherit" }}>Privacy Policy</Link>
    </p>
  );
}
