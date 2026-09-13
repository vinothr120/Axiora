async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || "request_failed");
    err.status = res.status;
    err.code = body.error;
    throw err;
  }
  return body;
}

export const api = {
  // client auth
  clientLogin: (code) => request("/auth/login", { method: "POST", body: JSON.stringify({ code }) }),
  clientLogout: () => request("/auth/logout", { method: "POST" }),
  clientMe: () => request("/auth/me"),

  // calculator
  listTemplates: () => request("/templates"),
  getTemplate: (id) => request(`/templates/${id}`),
  calculate: (id, { edits, custom, hidden }) =>
    request(`/templates/${id}/calculate`, { method: "POST", body: JSON.stringify({ edits, custom, hidden }) }),
  resetTemplate: (id) => request(`/templates/${id}/reset`, { method: "POST" }),

  // admin
  adminLogin: (username, password) =>
    request("/admin/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  adminLogout: () => request("/admin/logout", { method: "POST" }),
  adminMe: () => request("/admin/me"),
  adminListTemplates: () => request("/admin/templates"),
  listCodes: () => request("/admin/codes"),
  createCode: (label, durationDays, templates) =>
    request("/admin/codes", { method: "POST", body: JSON.stringify({ label, durationDays, templates }) }),
  bulkCreateCodes: (label, durationDays, count, templates) =>
    request("/admin/codes/bulk", { method: "POST", body: JSON.stringify({ label, durationDays, count, templates }) }),
  revokeCode: (id) => request(`/admin/codes/${id}/revoke`, { method: "POST" }),
  reactivateCode: (id) => request(`/admin/codes/${id}/reactivate`, { method: "POST" }),
  setCodeTemplates: (id, templates) =>
    request(`/admin/codes/${id}/templates`, { method: "POST", body: JSON.stringify({ templates }) }),
};
