import { useState } from "react";

const FIELDS = ["open", "high", "low", "close"];
const FIELD_LABELS = { open: "Open", high: "High", low: "Low", close: "Close" };

export default function AddRowForm({ groups, onAdd }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState(groups[0]?.key || "A");
  const [values, setValues] = useState({ open: "", high: "", low: "", close: "" });

  function reset() {
    setName("");
    setValues({ open: "", high: "", low: "", close: "" });
    setExpanded(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nums = FIELDS.map((f) => Number(values[f]));
    if (!name.trim() || nums.some((n) => !Number.isFinite(n))) return;
    onAdd({
      key: `custom-${crypto.randomUUID()}`,
      label: name.trim(),
      group,
      open: nums[0],
      high: nums[1],
      low: nums[2],
      close: nums[3],
    });
    reset();
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 hover:border-slate-400 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
      >
        + Add row
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Aluminium"
          className="w-36 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Formula style</label>
        <select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        >
          {groups.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      {FIELDS.map((f) => (
        <div key={f}>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{FIELD_LABELS[f]}</label>
          <input
            type="number"
            inputMode="decimal"
            value={values[f]}
            onChange={(e) => setValues((v) => ({ ...v, [f]: e.target.value }))}
            className="figure w-20 rounded-md border border-slate-300 px-2 py-1.5 text-right text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      ))}
      <div className="flex gap-2">
        <button type="submit" className="rounded-md py-1.5 px-3 text-sm font-semibold text-white" style={{ backgroundColor: "var(--role-accent)" }}>
          Add
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
