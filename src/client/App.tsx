import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PaymentPage from "./pages/PaymentPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";

function RedirectToAdmin() {
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RedirectToAdmin />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pay/:username" element={<PaymentPage />} />
      </Routes>
    </BrowserRouter>
  );
}
