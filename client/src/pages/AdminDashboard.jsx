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

function CodeTemplatesCell({ code, allTemplates, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [selected, setSelected] = useState(code.templates);
  const [saving, setSaving] = useState(false);
  const nameFor = (id) => allTemplates.find((t) => t.id === id)?.name || id;
  const isAll = allTemplates.length > 0 && code.templates.length === allTemplates.length;

  async function save() {
    setSaving(true);
    try {
      await api.setCodeTemplates(code.id, selected);
      onSaved();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    const anyRowEdit = code.templates.some((t) => t.canManageRows);
    const summary = code.templates.map((t) => `${nameFor(t.id)}${t.canManageRows ? " (rows)" : ""}`).join(", ");
    const label = code.templates.length === 0 ? "None" : isAll && !anyRowEdit ? "All" : summary;
    return (
      <button
        onClick={() => {
          setSelected(code.templates);
          setEditing(true);
        }}
        className="text-left text-xs text-slate-600 hover:underline dark:text-slate-300"
        title="Click to edit"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="w-56 space-y-2 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-800">
      <TemplateCheckboxes templates={allTemplates} selected={selected} onChange={setSelected} />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving || selected.length === 0}
          className="rounded-md px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: "var(--role-accent)" }}
        >
          Save
        </button>
        <button onClick={() => setEditing(false)} className="rounded-md border border-slate-300 px-2 py-1 text-xs dark:border-slate-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { admin, logout } = useAdminAuth();
  const [codes, setCodes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [filter, setFilter] = useState("all"); // all | active | expired | revoked
  const [loading, setLoading] = useState(true);

  const [singleLabel, setSingleLabel] = useState("");
  const [singleDays, setSingleDays] = useState(30);
  const [singleTemplates, setSingleTemplates] = useState([]);
  const [singleResult, setSingleResult] = useState(null);

  const [bulkLabel, setBulkLabel] = useState("");
  const [bulkDays, setBulkDays] = useState(30);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkTemplates, setBulkTemplates] = useState([]);
  const [bulkResult, setBulkResult] = useState(null);

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
      const allGranted = templates.map((t) => ({ id: t.id, canManageRows: false }));
      setSingleTemplates(allGranted);
      setBulkTemplates(allGranted);
    });
  }, [refresh]);

  async function handleGenerateSingle(e) {
    e.preventDefault();
    const { code } = await api.createCode(singleLabel || null, Number(singleDays), singleTemplates);
    setSingleResult(code.code);
    setSingleLabel("");
    refresh();
  }

  async function handleGenerateBulk(e) {
    e.preventDefault();
    const { codes } = await api.bulkCreateCodes(bulkLabel || null, Number(bulkDays), Number(bulkCount), bulkTemplates);
    setBulkResult(codes);
    setBulkLabel("");
    refresh();
  }

  async function handleRevoke(id) {
    await api.revokeCode(id);
    refresh();
  }

  async function handleReactivate(id) {
    await api.reactivateCode(id);
    refresh();
  }

  const filtered = codes.filter((c) => {
    if (filter === "all") return true;
    if (filter === "active") return c.status === "active" && !c.isExpired;
    if (filter === "expired") return c.isExpired;
    if (filter === "revoked") return c.status === "revoked";
    return true;
  });

  return (
    <div data-role="admin" className="flex min-h-svh flex-col bg-slate-50 dark:bg-slate-950">
      <Header eyebrow="Admin" title="Access code management" userLabel={admin?.username} onLogout={logout} />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Generate a code">
            <form onSubmit={handleGenerateSingle} className="space-y-3">
              <Field label="Label (optional)">
                <input className={inputCls} value={singleLabel} onChange={(e) => setSingleLabel(e.target.value)} placeholder="e.g. Ramesh" />
              </Field>
              <Field label="Valid for (days)">
                <input type="number" min="1" className={inputCls} value={singleDays} onChange={(e) => setSingleDays(e.target.value)} />
              </Field>
              <TemplateCheckboxes templates={templates} selected={singleTemplates} onChange={setSingleTemplates} />
              <button
                type="submit"
                disabled={singleTemplates.length === 0}
                className="w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--role-accent)" }}
              >
                Generate code
              </button>
              {singleResult && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-center font-mono text-sm font-semibold tracking-wider text-slate-900 dark:bg-slate-800 dark:text-white">
                  {singleResult}
                </div>
              )}
            </form>
          </Card>

          <Card title="Bulk generate">
            <form onSubmit={handleGenerateBulk} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="How many">
                  <input type="number" min="1" max="500" className={inputCls} value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} />
                </Field>
                <Field label="Valid for (days)">
                  <input type="number" min="1" className={inputCls} value={bulkDays} onChange={(e) => setBulkDays(e.target.value)} />
                </Field>
              </div>
              <Field label="Batch label (optional)">
                <input className={inputCls} value={bulkLabel} onChange={(e) => setBulkLabel(e.target.value)} placeholder="e.g. Sept batch" />
              </Field>
              <TemplateCheckboxes templates={templates} selected={bulkTemplates} onChange={setBulkTemplates} />
              <button
                type="submit"
                disabled={bulkTemplates.length === 0}
                className="w-full rounded-lg py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "var(--role-accent)" }}
              >
                Generate codes
              </button>
              {bulkResult && (
                <textarea
                  readOnly
                  rows={4}
                  className="figure w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  value={bulkResult.join("\n")}
                  onFocus={(e) => e.target.select()}
                />
              )}
            </form>
          </Card>
        </div>

        <Card title="All codes">
          <div className="mb-3 flex gap-2">
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

          {loading ? (
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
                      <td className="figure px-2 py-2 font-medium text-slate-900 dark:text-white">{c.code}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.label || "–"}</td>
                      <td className="px-2 py-2">
                        <StatusBadge status={c.status} isExpired={c.isExpired} />
                      </td>
                      <td className="relative px-2 py-2">
                        <CodeTemplatesCell code={c} allTemplates={templates} onSaved={refresh} />
                      </td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.durationDays}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.expiresAt ? c.expiresAt.slice(0, 10) : "not activated"}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.lastUsedAt ? c.lastUsedAt.slice(0, 16).replace("T", " ") : "–"}</td>
                      <td className="px-2 py-2 text-slate-600 dark:text-slate-300">{c.hasActiveSession ? "logged in" : "–"}</td>
                      <td className="px-2 py-2 text-right">
                        {c.status === "active" ? (
                          <button onClick={() => handleRevoke(c.id)} className="text-xs font-medium text-red-700 hover:underline dark:text-red-400">
                            Revoke
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(c.id)} className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-sm text-slate-400">
                        No codes in this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>
      <Footer />
    </div>
  );
}
