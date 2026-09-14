import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAdminAuth } from "../core/AdminAuthContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TemplateCheckboxes from "../components/TemplateCheckboxes";

function StatusBadge({ status, isExpired }) {
  if (status === "revoked")
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">Revoked</span>;
  if (isExpired)
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">Expired</span>;
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">Active</span>;
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-heading text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function nameFor(allTemplates, id) {
  return allTemplates.find((t) => t.id === id)?.name || id;
}

function templatesSummary(code, allTemplates) {
  if (code.templates.length === 0) return "None";
  const isAll = allTemplates.length > 0 && code.templates.length === allTemplates.length;
  const anyRowEdit = code.templates.some((t) => t.canManageRows);
  if (isAll && !anyRowEdit) return "All";
  return code.templates.map((t) => `${nameFor(allTemplates, t.id)}${t.canManageRows ? " (rows)" : ""}`).join(", ");
}

function EditCodeModal({ code, allTemplates, onClose, onSaved }) {
  const [label, setLabel] = useState(code.label || "");
  const [days, setDays] = useState(code.durationDays);
  const [expiresAt, setExpiresAt] = useState(code.expiresAt ? code.expiresAt.slice(0, 10) : "");
  const [selected, setSelected] = useState(code.templates);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.editCode(code.id, {
        label: label || null,
        durationDays: Number(days),
        expiresAt: code.activatedAt ? expiresAt || null : undefined,
        templates: selected,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.code || "save_failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Edit ${code.code}`} onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <Field label="Label">
          <input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Ramesh" />
        </Field>
        <Field label="Valid for (days)">
          <input type="number" min="1" className={inputCls} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
        {code.activatedAt ? (
          <Field label="Expires on">
            <input type="date" className={inputCls} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </Field>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Not activated yet — expiry will be set {days} day(s) after first use.
          </p>
        )}
        <TemplateCheckboxes templates={allTemplates} selected={selected} onChange={setSelected} />
        {error && <p className="text-xs text-red-600 dark:text-red-400">Couldn't save changes ({error}). Please try again.</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || selected.length === 0}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--role-accent)" }}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RevokeConfirmModal({ code, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Revoke access code?" onClose={onClose}>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
        <span className="figure font-semibold text-slate-900 dark:text-white">{code.code}</span>
        {code.label ? ` (${code.label})` : ""} will stop working immediately, and any active session will be signed out. This can be undone
        later by reactivating the code.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
          Cancel
        </button>
        <button
          onClick={async () => {
            setBusy(true);
            await onConfirm();
            setBusy(false);
          }}
          disabled={busy}
          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Revoking…" : "Revoke code"}
        </button>
      </div>
    </Modal>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard access denied; nothing useful to do
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const [codes, setCodes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState("all"); // all | active | expired | revoked
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState(null);

  const [genLabel, setGenLabel] = useState("");
  const [genDays, setGenDays] = useState(30);
  const [genMultiple, setGenMultiple] = useState(false);
  const [genCount, setGenCount] = useState(10);
  const [genTemplates, setGenTemplates] = useState([]);
  const [genResult, setGenResult] = useState(null); // { type: "single", code } | { type: "bulk", codes }

  const [editingCode, setEditingCode] = useState(null);
  const [revokingCode, setRevokingCode] = useState(null);

  const refresh = useCallback(() => {
    setLoading(true);
    api
      .listCodes()
      .then(({ codes }) => setCodes(codes))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    api.adminListTemplates().then(({ templates }) => {
      setTemplates(templates);
      setGenTemplates(templates.map((t) => ({ id: t.id, canManageRows: false })));
    });
  }, [refresh]);

  async function handleGenerate(e) {
    e.preventDefault();
    setGenResult(null);
    if (genMultiple) {
      const { codes } = await api.bulkCreateCodes(genLabel || null, Number(genDays), Number(genCount), genTemplates);
      setGenResult({ type: "bulk", codes });
    } else {
      const { code } = await api.createCode(genLabel || null, Number(genDays), genTemplates);
      setGenResult({ type: "single", code: code.code });
    }
    setGenLabel("");
    refresh();
  }

  async function handleRevoke(code) {
    setPendingId(code.id);
    try {
      await api.revokeCode(code.id);
      setRevokingCode(null);
      refresh();
    } finally {
      setPendingId(null);
    }
  }

  async function handleReactivate(id) {
    setPendingId(id);
    try {
      await api.reactivateCode(id);
      refresh();
    } finally {
      setPendingId(null);
    }
  }

  const PAGE_SIZE = 30;
  const filteredAll = codes
    .filter((c) => {
      if (filter === "all") return true;
      if (filter === "active") return c.status === "active" && !c.isExpired;
      if (filter === "expired") return c.isExpired;
      if (filter === "revoked") return c.status === "revoked";
      return true;
    })
    .filter((c) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return c.code.toLowerCase().includes(q) || (c.label || "").toLowerCase().includes(q);
    });
  const totalPages = Math.max(1, Math.ceil(filteredAll.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const filtered = filteredAll.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  return (
    <div data-role="admin" className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
      <Header eyebrow="Admin" title="Access code management" userLabel={admin?.username} onLogout={logout} />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        <Card title="Generate codes">
          <form onSubmit={handleGenerate} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Label (optional)">
                <input className={inputCls} value={genLabel} onChange={(e) => setGenLabel(e.target.value)} placeholder="e.g. Ramesh" />
              </Field>
              <Field label="Valid for (days)">
                <input type="number" min="1" className={inputCls} value={genDays} onChange={(e) => setGenDays(e.target.value)} />
              </Field>
            </div>

            <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={genMultiple} onChange={(e) => setGenMultiple(e.target.checked)} />
              Generate multiple codes
            </label>
            {genMultiple && (
              <Field label="How many">
                <input
                  type="number"
                  min="1"
                  max="500"
                  className={`${inputCls} sm:w-40`}
                  value={genCount}
                  onChange={(e) => setGenCount(e.target.value)}
                />
              </Field>
            )}

            <TemplateCheckboxes templates={templates} selected={genTemplates} onChange={setGenTemplates} />

            <button
              type="submit"
              disabled={genTemplates.length === 0}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--role-accent)" }}
            >
              {genMultiple ? `Generate ${genCount || ""} codes` : "Generate code"}
            </button>

            {genResult && (
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                {genResult.type === "single" ? (
                  <div className="figure flex-1 text-center text-sm font-semibold tracking-wider text-slate-900 dark:text-white">
                    {genResult.code}
                  </div>
                ) : (
                  <textarea
                    readOnly
                    rows={4}
                    className="figure flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    value={genResult.codes.join("\n")}
                    onFocus={(e) => e.target.select()}
                  />
                )}
                <CopyButton text={genResult.type === "single" ? genResult.code : genResult.codes.join("\n")} />
              </div>
            )}
          </form>
        </Card>

        <Card title="All codes">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              {["all", "active", "expired", "revoked"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                    filter === f
                      ? "text-white"
                      : "border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"
                  }`}
                  style={filter === f ? { backgroundColor: "var(--role-accent)" } : undefined}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              className={`${inputCls} ml-auto max-w-xs`}
              placeholder="Search by code or label…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading && codes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700">Code</th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700">Label</th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700">Status</th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700">Templates</th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700">Days</th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700">Expires</th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700">Last used</th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700">Session</th>
                    <th className="border-b border-slate-200 px-2 py-2 dark:border-slate-700"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/40">
                      <td className="figure whitespace-nowrap px-2 py-2 font-medium text-slate-900 dark:text-white">{c.code}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.label || "–"}</td>
                      <td className="px-2 py-2">
                        <StatusBadge status={c.status} isExpired={c.isExpired} />
                      </td>
                      <td className="max-w-xs px-2 py-2 text-xs text-slate-600 dark:text-slate-300" title={templatesSummary(c, templates)}>
                        {templatesSummary(c, templates)}
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.durationDays}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.expiresAt ? c.expiresAt.slice(0, 10) : "not activated"}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.lastUsedAt ? c.lastUsedAt.slice(0, 16).replace("T", " ") : "–"}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.hasActiveSession ? "logged in" : "–"}</td>
                      <td className="px-2 py-2 text-right">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setEditingCode(c)}
                            disabled={pendingId === c.id}
                            className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-40 dark:text-slate-300"
                          >
                            Edit
                          </button>
                          {c.status === "active" ? (
                            <button
                              onClick={() => setRevokingCode(c)}
                              disabled={pendingId === c.id}
                              className="text-xs font-medium text-red-700 hover:underline disabled:opacity-40 dark:text-red-400"
                            >
                              Revoke
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(c.id)}
                              disabled={pendingId === c.id}
                              className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-40 dark:text-emerald-400"
                            >
                              {pendingId === c.id ? "Reactivating…" : "Reactivate"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-sm text-slate-400">
                        No codes match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {filteredAll.length > PAGE_SIZE && (
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredAll.length)} of{" "}
                    {filteredAll.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="rounded-md border border-slate-300 px-2 py-1 font-medium disabled:opacity-40 dark:border-slate-600"
                    >
                      Prev
                    </button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="rounded-md border border-slate-300 px-2 py-1 font-medium disabled:opacity-40 dark:border-slate-600"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
      <Footer />

      {editingCode && (
        <EditCodeModal code={editingCode} allTemplates={templates} onClose={() => setEditingCode(null)} onSaved={refresh} />
      )}
      {revokingCode && (
        <RevokeConfirmModal code={revokingCode} onClose={() => setRevokingCode(null)} onConfirm={() => handleRevoke(revokingCode)} />
      )}
    </div>
  );
}
