const FIELDS = ["open", "high", "low", "close"];
const FIELD_LABELS = { open: "OPEN", high: "HIGH", low: "LOW", close: "CLOSE" };

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

function Td({ children, className = "" }) {
  return (
    <td className={`figure whitespace-nowrap px-3 py-2 text-right text-sm text-slate-700 dark:text-slate-200 ${className}`}>
      {children}
    </td>
  );
}

function SymbolCell({ children }) {
  return (
    <td className="sticky left-0 z-[1] whitespace-nowrap border-r border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
      {children}
    </td>
  );
}

export function InputsAndStatsTable({ rows, inputs, onChange }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full border-collapse bg-white dark:bg-slate-900">
        <thead>
          <tr>
            <Th className="sticky left-0 z-[1] bg-slate-50 text-left dark:bg-slate-800">Symbol</Th>
            {FIELDS.map((f) => (
              <Th key={f} style={{ color: "var(--role-accent)" }}>
                {FIELD_LABELS[f]}
              </Th>
            ))}
            <Th>HLC A</Th>
            <Th>AVG</Th>
            <Th>H-L</Th>
            <Th>TODAY OPEN</Th>
            <Th>L-C</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const editable = inputs[row.key] || {};
            return (
              <tr key={row.key} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/40">
                <SymbolCell>{row.label}</SymbolCell>
                {FIELDS.map((f) => (
                  <td key={f} className="whitespace-nowrap px-1.5 py-1">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editable[f] ?? ""}
                      onChange={(e) => onChange(row.key, f, e.target.value)}
                      className="figure w-24 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-right text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    />
                  </td>
                ))}
                <Td>{fmt(row.block1.hlcA)}</Td>
                <Td>{fmt(row.block1.avg)}</Td>
                <Td>{fmt(row.block1.varHL)}</Td>
                <Td>{fmt(row.todayOpen)}</Td>
                <Td>{fmt(row.block1.lowClose)}</Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TradeLevelsTable({ rows }) {
  const maxTargets = Math.max(...rows.map((r) => r.block2.targetsUp.length), 5);
  const targetCols = Array.from({ length: maxTargets }, (_, i) => i);
  const ordinal = ["1ST", "2ND", "3RD", "4TH", "5TH", "6TH"];

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="min-w-full border-collapse bg-white dark:bg-slate-900">
        <thead>
          <tr>
            <Th className="sticky left-0 z-[1] bg-slate-50 text-left dark:bg-slate-800">Symbol</Th>
            <Th className="text-emerald-700 dark:text-emerald-400">BUY ABV</Th>
            {targetCols.map((i) => (
              <Th key={`u${i}`}>{ordinal[i]} TGT</Th>
            ))}
            <Th className="text-red-700 dark:text-red-400">S/L</Th>
            <Th className="text-red-700 dark:text-red-400">SELL BLW</Th>
            {targetCols.map((i) => (
              <Th key={`d${i}`}>{ordinal[i]} TGT</Th>
            ))}
            <Th className="text-emerald-700 dark:text-emerald-400">S/L</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="odd:bg-white even:bg-slate-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/40">
              <SymbolCell>{row.label}</SymbolCell>
              <Td className="font-semibold text-emerald-700 dark:text-emerald-400">{fmt(row.block2.buyAbove)}</Td>
              {targetCols.map((i) => (
                <Td key={`u${i}`}>{fmt(row.block2.targetsUp[i])}</Td>
              ))}
              <Td className="text-red-700 dark:text-red-400">{fmt(row.block2.stopLoss)}</Td>
              <Td className="font-semibold text-red-700 dark:text-red-400">{fmt(row.block2.sellBelow)}</Td>
              {targetCols.map((i) => (
                <Td key={`d${i}`}>{fmt(row.block2.targetsDown[i])}</Td>
              ))}
              <Td className="text-emerald-700 dark:text-emerald-400">{fmt(row.block2.stopLossSell)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
