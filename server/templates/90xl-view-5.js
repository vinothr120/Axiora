// Ported 1:1 from D:\Dad\Original\90 XL VIEW 5.xlsx (Sheet1), verified against the
// workbook's cached formula results.
//
// Unlike the other templates, this one is a pure Fibonacci retracement/extension
// ladder: only HIGH/LOW are real inputs, and a single formula is applied at 20 fixed
// ratio levels — BUY = LOW + (HIGH-LOW)*ratio, SELL = HIGH - (HIGH-LOW)*ratio.
// (ZINC M / LEAD M exist as row labels in the source with no HIGH/LOW data and no
// formulas referencing them — genuinely blank template rows, so they're omitted here;
// add them back via "Add row" if ever needed.)

const RATIOS = [0.09, 0.146, 0.236, 0.382, 0.47, 0.5, 0.618, 0.764, 0.786, 0.854, 1, 1.236, 1.382, 1.618, 2, 2.618, 3.236, 4.236, 5.236, 6.854];

const SYMBOLS = [
  { key: "SILVER", label: "SILVER", group: "FIB", defaults: { high: 38867, low: 38591 } },
  { key: "SILVER_M", label: "SILVER M", group: "FIB", defaults: { high: 38921, low: 38645 } },
  { key: "GOLD", label: "GOLD", group: "FIB", defaults: { high: 31512, low: 31288 } },
  { key: "GOLD_M", label: "GOLD M", group: "FIB", defaults: { high: 31524, low: 31300 } },
  { key: "CRUDE", label: "CRUDE", group: "FIB", defaults: { high: 3197, low: 3175 } },
  { key: "CRUDE_M", label: "CRUDE M", group: "FIB", defaults: { high: 3191, low: 3168 } },
  { key: "COPPER", label: "COPPER", group: "FIB", defaults: { high: 409.05, low: 407.05 } },
  { key: "COPPER_M", label: "COPPER M", group: "FIB", defaults: { high: 408.8, low: 407.1 } },
  { key: "NICKEL", label: "NICKEL", group: "FIB", defaults: { high: 743.8, low: 737.8 } },
  { key: "NICKEL_M", label: "NICKEL M", group: "FIB", defaults: { high: 742.7, low: 737.2 } },
  { key: "ZINC", label: "ZINC", group: "FIB", defaults: { high: 172.5, low: 171.65 } },
  { key: "LEAD", label: "LEAD", group: "FIB", defaults: { high: 140.65, low: 139.85 } },
  { key: "N_GAS", label: "N GAS", group: "FIB", defaults: { high: 210.1, low: 205.3 } },
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
  id: "90xl-view-5",
  name: "90 XL View 5",
  layout: "fibonacci",
  inputFields: ["high", "low"],
  symbols: SYMBOLS,
  groups: GROUPS,
  isValidGroup: (g) => GROUP_KEYS.has(g),
  statColumns: STAT_COLUMNS,
  calculate,
  calculateRow,
};
