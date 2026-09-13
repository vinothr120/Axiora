import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const ClientAuthContext = createContext(null);

export function ClientAuthProvider({ children }) {
  const [status, setStatus] = useState("loading"); // loading | authed | anon
  const [info, setInfo] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.clientMe();
      setInfo(me);
      setStatus("authed");
    } catch {
      setInfo(null);
      setStatus("anon");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (code) => {
    const result = await api.clientLogin(code);
    await refresh();
    return result;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.clientLogout();
    } finally {
      setInfo(null);
      setStatus("anon");
    }
  }, []);

  return (
    <ClientAuthContext.Provider value={{ status, info, login, logout, refresh, setAnon: () => setStatus("anon") }}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const ctx = useContext(ClientAuthContext);
  if (!ctx) throw new Error("useClientAuth must be used within ClientAuthProvider");
  return ctx;
}
