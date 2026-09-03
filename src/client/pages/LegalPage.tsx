import { Link } from "react-router-dom";
import ThemeToggle from "./../theme";

function Layout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <ThemeToggle />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "48px 20px 80px" }}>
        <Link to="/login" style={{ fontSize: 13, color: "var(--primary)", textDecoration: "none" }}>&larr; Back</Link>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "16px 0 24px" }}>{title}</h1>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", display: "flex", flexDirection: "column", gap: 16 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <Layout title="Terms of Service">
      <p>Pay Cash ("we," "us") lets sub-admins accept payments from senders via Cash App's Bitcoin Lightning payment option, and forwards the resulting value to sub-admins as a local-currency balance, withdrawable via bKash, Nagad, or bank transfer.</p>
      <p><strong>Not affiliated with Cash App.</strong> Pay Cash is an independent service and is not operated, endorsed, or affiliated with Block, Inc. or Cash App. We use Cash App's public Lightning payment feature as a payment rail, nothing more.</p>
      <p><strong>Fees.</strong> A service fee, if applicable to your account, is shown to you in your sub-admin settings before you send or receive payments through your page.</p>
      <p><strong>Sub-admin responsibilities.</strong> You're responsible for the accuracy of the payout details you submit (bKash/Nagad/bank info) and for any payment page you operate. Don't use Pay Cash for unlawful purposes, fraud, or to collect payments under false pretenses.</p>
      <p><strong>Payment finality.</strong> Payments are confirmed once verified against our payment processor's records. Expired or unpaid invoices are not credited.</p>
      <p><strong>No guarantees.</strong> The service is provided "as is." We don't guarantee uninterrupted availability, and currency conversion rates may change day to day.</p>
      <p><strong>Termination.</strong> We may suspend or close an account that violates these terms or applicable law.</p>
      <p><strong>Contact.</strong> Questions about these terms: hasanmahmud6634@gmail.com.</p>
    </Layout>
  );
}

export function PrivacyPage() {
  return (
    <Layout title="Privacy Policy">
      <p>This page explains what information Pay Cash collects and how it's used.</p>
      <p><strong>What we collect.</strong> Account details you provide at signup (name, email, phone, username, password), payout details for withdrawals (bKash/Nagad/bank account info), and records of payments made through your page (amount, status, timestamps).</p>
      <p><strong>What we don't collect.</strong> We never see or store your Cash App login credentials — payments are completed entirely on Cash App's own site or app.</p>
      <p><strong>How it's used.</strong> Solely to operate your account: processing payments, crediting your balance, paying out withdrawals, and account support/recovery.</p>
      <p><strong>Sharing.</strong> We don't sell your data. Information is shared only with the payment processor needed to complete a transaction, or when required by law.</p>
      <p><strong>Storage.</strong> Data is stored on our hosting provider's servers and retained for as long as your account is active plus a reasonable period for record-keeping.</p>
      <p><strong>Your rights.</strong> You can request access to or deletion of your account data by contacting us.</p>
      <p><strong>Contact.</strong> Privacy questions: hasanmahmud6634@gmail.com.</p>
    </Layout>
  );
}
