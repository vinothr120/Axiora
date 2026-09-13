export default function TemplateCheckboxes({ templates, selected, onChange }) {
  function toggle(id) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Templates</label>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700">
        {templates.map((t) => (
          <label key={t.id} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
            <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} />
            {t.name}
          </label>
        ))}
        {templates.length === 0 && <span className="text-xs text-slate-400">No templates registered yet.</span>}
      </div>
    </div>
  );
}
