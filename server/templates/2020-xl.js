// Ported 1:1 from D:\Dad\Original\2020 XL.xlsx (Sheet1), verified against the
// workbook's cached formula results. The same Fibonacci ladder as 90xl-view-5/
// 90xl-new-2026 (BUY = LOW + (HIGH-LOW)*ratio, SELL = HIGH - (HIGH-LOW)*ratio), but
// this source predates those: only one symbol (SILVER) and 17 ratio levels instead of
// 20 (no 4.236/5.236/6.854 extension). Add more symbols via "Add row" if needed — they
// use the same formula.

const RATIOS = [0.09, 0.146, 0.236, 0.382, 0.47, 0.5, 0.618, 0.764, 0.786, 0.854, 1, 1.236, 1.382, 1.618, 2, 2.618, 3.236];

const SYMBOLS = [{ key: "SILVER", label: "SILVER", group: "FIB", defaults: { high: 90690, low: 89267 } }];

const GROUPS = [{ key: "FIB", label: "Fibonacci ladder (Buy/Sell at 17 ratio levels)" }];
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
  id: "2020-xl",
  name: "2020 XL",
  layout: "fibonacci",
  inputFields: ["high", "low"],
  symbols: SYMBOLS,
  groups: GROUPS,
  isValidGroup: (g) => GROUP_KEYS.has(g),
  statColumns: STAT_COLUMNS,
  calculate,
  calculateRow,
};
