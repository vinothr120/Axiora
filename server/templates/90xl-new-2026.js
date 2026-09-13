// Ported 1:1 from D:\Dad\Original\90XL NEW 2026.xlsx (Sheet1), verified against the
// workbook's cached formula results. Same Fibonacci-ladder methodology as 90xl-view-5
// (BUY = LOW + (HIGH-LOW)*ratio, SELL = HIGH - (HIGH-LOW)*ratio across the same 20 fixed
// ratio levels) applied to a different, broader symbol set that also covers stock
// futures, not just commodities.
//
// The source repeats "SILVER"/"GOLD"/"N GAS" as bare labels for a second, very
// different price convention (e.g. SILVER at ~254,174 vs ~31.32 — different lot/unit
// scale) with no disambiguation of its own; labeled here as "(Alt)" for clarity.
// Three more listed rows (a 3rd SILVER, 3rd GOLD, 2nd INR) have no ladder formulas
// wired to them in the source — genuinely unused rows, omitted here same as
// 90xl-view-5's ZINC M/LEAD M.

const RATIOS = [0.09, 0.146, 0.236, 0.382, 0.47, 0.5, 0.618, 0.764, 0.786, 0.854, 1, 1.236, 1.382, 1.618, 2, 2.618, 3.236, 4.236, 5.236, 6.854];

const SYMBOLS = [
  { key: "SILVER", label: "SILVER", group: "FIB", defaults: { high: 254174, low: 87150 } },
  { key: "SILVER_M", label: "SILVER M", group: "FIB", defaults: { high: 78.22, low: 30.06 } },
  { key: "SILVER_MIC", label: "SILVER MIC", group: "FIB", defaults: { high: 4553, low: 2669 } },
  { key: "GOLD", label: "GOLD", group: "FIB", defaults: { high: 91213, low: 89660 } },
  { key: "GOLD_M", label: "GOLD M", group: "FIB", defaults: { high: 93520, low: 92000 } },
  { key: "CRUDE_OIL", label: "CRUDE OIL", group: "FIB", defaults: { high: 4777, low: 4634 } },
  { key: "COPPER", label: "COPPER", group: "FIB", defaults: { high: 643.2, low: 642.15 } },
  { key: "SILVER_ALT", label: "SILVER (Alt)", group: "FIB", defaults: { high: 31.32, low: 30.8 } },
  { key: "GOLD_ALT", label: "GOLD (Alt)", group: "FIB", defaults: { high: 2649, low: 2618 } },
  { key: "INR", label: "INR", group: "FIB", defaults: { high: 80.12, low: 76.37 } },
  { key: "N_GAS", label: "N GAS", group: "FIB", defaults: { high: 293.8, low: 284.9 } },
  { key: "LEAD", label: "LEAD", group: "FIB", defaults: { high: 181.3, low: 177.1 } },
  { key: "N_GAS_ALT", label: "N GAS (Alt)", group: "FIB", defaults: { high: 307.6, low: 296.1 } },
];

const GROUPS = [{ key: "FIB", label: "Fibonacci ladder (Buy/Sell at 20 ratio levels)" }];
const GROUP_KEYS = new Set(GROUPS.map((g) => g.key));

const STAT_COLUMNS = [{ key: "varHL", label: "H-L" }];

function calculateRow({ key, label }, { high, low }) {
  const varHL = high - low;
  const fibLevels = RATIOS.map((ratio) => ({
    ratio,
    label: Number((ratio * 100).toFixed(3)).toString(),
    buy: low + varHL * ratio,
    sell: high - varHL * ratio,
  }));
  return {
    key,
    label,
    group: "FIB",
    isCustom: !SYMBOLS.some((s) => s.key === key),
    input: { high, low },
    todayOpen: null,
    block1: { varHL },
    fibLevels,
  };
}

function calculate(input = {}) {
  return SYMBOLS.map((symbolDef) => {
    const ohlc = { ...symbolDef.defaults, ...(input[symbolDef.key] || {}) };
    return calculateRow(symbolDef, ohlc);
  });
}

module.exports = {
  id: "90xl-new-2026",
  name: "90XL New 2026",
  layout: "fibonacci",
  inputFields: ["high", "low"],
  symbols: SYMBOLS,
  groups: GROUPS,
  isValidGroup: (g) => GROUP_KEYS.has(g),
  statColumns: STAT_COLUMNS,
  calculate,
  calculateRow,
};
