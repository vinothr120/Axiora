const FIELDS = ["open", "high", "low", "close"];
const FIELD_LABELS = { open: "OPEN", high: "HIGH", low: "LOW", close: "CLOSE" };

// Ladder color roles ported from the source workbook's own font colors (see index.css
// for the hex values) — index 0/1 get their own hue, 2+ share the "far target" green.
const TARGET_COLOR_VARS = ["var(--ladder-tgt1)", "var(--ladder-tgt2)"];
const FAR_TARGET_COLOR = "var(--ladder-tgt-far)";

function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function Th({ children, className = "", style }) {
  return (
    <th
      style={style}
      className={`whitespace-nowrap border-b border-slate-200 px-3 py-2 text-right font-mono text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400 ${className}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "", style }) {
  return (
    <td
      style={style}
      className={`figure whitespace-nowrap px-3 py-2 text-right text-sm text-slate-700 dark:text-slate-200 ${className}`}
    >
      {children}
    </td>
  );
}

function SymbolCell({ children, onDelete }) {
  return (
    <td className="sticky left-0 z-[1] whitespace-nowrap border-r border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
      <div className="flex items-center gap-1.5">
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Remove row"
            className="-ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-600 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400"
          >
            ×
          </button>
        )}
        <span>{children}</span>
      </div>
    </td>
  );
}

export function InputsAndStatsTable({ rows, inputs, onChange, onDeleteRow, statColumns }) {
  const cols = statColumns && statColumns.length > 0 ? statColumns : [{ key: "avg", label: "AVG" }];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full border-collapse bg-white dark:bg-slate-900">
        <thead>
          <tr>
            <Th className="sticky left-0 z-[1] bg-slate-50 text-left dark:bg-slate-800">Symbol</Th>
            <Th style={{ color: "var(--ladder-open)" }}>OPEN</Th>
            <Th>HIGH</Th>
            <Th>LOW</Th>
            <Th>CLOSE</Th>
            {cols.map((col) => (
              <Th key={col.key} style={col.key === "todayOpen" ? { color: "var(--ladder-open)" } : undefined}>
                {col.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const editable = inputs[row.key] || {};
            return (
              <tr key={row.key} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/40">
                <SymbolCell onDelete={onDeleteRow ? () => onDeleteRow(row.key) : undefined}>{row.label}</SymbolCell>
                {FIELDS.map((f) => (
                  <td key={f} className="whitespace-nowrap px-1.5 py-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editable[f] ?? ""}
                      onChange={(e) => onChange(row.key, f, e.target.value)}
                      style={f === "open" ? { color: "var(--ladder-open)" } : undefined}
                      className="figure w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </td>
                ))}
                {cols.map((col) => (
                  <Td key={col.key} style={col.key === "todayOpen" ? { color: "var(--ladder-open)" } : undefined}>
                    {fmt(col.key === "todayOpen" ? row.todayOpen : row.block1[col.key])}
                  </Td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TradeLevelsTable({ rows }) {
  const maxTargets = Math.max(...rows.map((r) => r.block2.targetsUp.length));
  const targetCols = Array.from({ length: maxTargets }, (_, i) => i);
  const ordinal = ["1ST", "2ND", "3RD", "4TH", "5TH", "6TH"];
  const targetColor = (i) => TARGET_COLOR_VARS[i] || FAR_TARGET_COLOR;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full border-collapse bg-white dark:bg-slate-900">
        <thead>
          <tr>
            <Th className="sticky left-0 z-[1] bg-slate-50 text-left dark:bg-slate-800">Symbol</Th>
            <Th style={{ color: "var(--ladder-open)" }}>BUY ABV</Th>
            {targetCols.map((i) => (
              <Th key={`u${i}`} style={{ color: targetColor(i) }}>
                {ordinal[i]} TGT
              </Th>
            ))}
            <Th style={{ color: "var(--ladder-sl)" }}>S/L</Th>
            <Th>SELL BLW</Th>
            {targetCols.map((i) => (
              <Th key={`d${i}`} style={i >= 2 ? { color: FAR_TARGET_COLOR } : undefined}>
                {ordinal[i]} TGT
              </Th>
            ))}
            <Th style={{ color: "var(--ladder-sl)" }}>S/L</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/40">
              <SymbolCell>{row.label}</SymbolCell>
              <Td className="font-semibold" style={{ color: "var(--ladder-open)" }}>
                {fmt(row.block2.buyAbove)}
              </Td>
              {targetCols.map((i) => (
                <Td key={`u${i}`} style={{ color: targetColor(i) }}>
                  {fmt(row.block2.targetsUp[i])}
                </Td>
              ))}
              <Td style={{ color: "var(--ladder-sl)" }}>{fmt(row.block2.stopLoss)}</Td>
              <Td className="font-semibold">{fmt(row.block2.sellBelow)}</Td>
              {targetCols.map((i) => (
                <Td key={`d${i}`} style={i >= 2 ? { color: FAR_TARGET_COLOR } : undefined}>
                  {fmt(row.block2.targetsDown[i])}
                </Td>
              ))}
              <Td style={{ color: "var(--ladder-sl)" }}>{fmt(row.block2.stopLossSell)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
