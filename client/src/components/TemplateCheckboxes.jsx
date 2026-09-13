// `selected` is [{ id, canManageRows }] — the set of templates granted, each with its
// own "can add/delete rows" sub-permission (only meaningful while granted).
export default function TemplateCheckboxes({ templates, selected, onChange }) {
  function find(id) {
    return selected.find((s) => s.id === id);
  }

  function toggleGranted(id) {
    if (find(id)) onChange(selected.filter((s) => s.id !== id));
    else onChange([...selected, { id, canManageRows: false }]);
  }

  function toggleManageRows(id) {
    onChange(selected.map((s) => (s.id === id ? { ...s, canManageRows: !s.canManageRows } : s)));
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Templates</label>
      <div className="space-y-1.5 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700">
        {templates.map((t) => {
          const entry = find(t.id);
          return (
            <div key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <label className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                <input type="checkbox" checked={Boolean(entry)} onChange={() => toggleGranted(t.id)} />
                {t.name}
              </label>
              {entry && (
                <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <input type="checkbox" checked={entry.canManageRows} onChange={() => toggleManageRows(t.id)} />
                  Allow add/delete rows
                </label>
              )}
            </div>
          );
        })}
        {templates.length === 0 && <span className="text-xs text-slate-400">No templates registered yet.</span>}
      </div>
    </div>
  );
}
