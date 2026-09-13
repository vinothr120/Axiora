import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./core/ThemeContext";
import { ClientAuthProvider, useClientAuth } from "./core/ClientAuthContext";
import { AdminAuthProvider, useAdminAuth } from "./core/AdminAuthContext";
import Login from "./pages/Login";
import Calculator from "./pages/Calculator";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";

function ClientGate({ children }) {
  const { status } = useClientAuth();
  if (status === "loading") return null;
  if (status === "anon") return <Navigate to="/login" replace />;
  return children;
}

function ClientLoginGate({ children }) {
  const { status } = useClientAuth();
  if (status === "loading") return null;
  if (status === "authed") return <Navigate to="/" replace />;
  return children;
}

function AdminGate({ children }) {
  const { status } = useAdminAuth();
  if (status === "loading") return null;
  if (status === "anon") return <Navigate to="/admin/login" replace />;
  return children;
}

function AdminLoginGate({ children }) {
  const { status } = useAdminAuth();
  if (status === "loading") return null;
  if (status === "authed") return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <ClientAuthProvider>
                <ClientLoginGate>
                  <Login />
                </ClientLoginGate>
              </ClientAuthProvider>
            }
          />
          <Route
            path="/"
            element={
              <ClientAuthProvider>
                <ClientGate>
                  <Calculator />
                </ClientGate>
              </ClientAuthProvider>
            }
          />
          <Route
            path="/admin/login"
            element={
              <AdminAuthProvider>
                <AdminLoginGate>
                  <AdminLogin />
                </AdminLoginGate>
              </AdminAuthProvider>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminAuthProvider>
                <AdminGate>
                  <AdminDashboard />
                </AdminGate>
              </AdminAuthProvider>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
