import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [status, setStatus] = useState("loading"); // loading | authed | anon
  const [admin, setAdmin] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.adminMe();
      setAdmin(me);
      setStatus("authed");
    } catch {
      setAdmin(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (username, password) => {
    const result = await api.adminLogin(username, password);
    await refresh();
    return result;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.adminLogout();
    } finally {
      setAdmin(null);
      setStatus("anon");
    }
  }, []);

  return (
    <AdminAuthContext.Provider value={{ status, admin, login, logout, refresh }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
