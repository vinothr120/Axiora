// Ported 1:1 from D:\Dad\Original\2026 NEW METHOD MCX.xlsx (Sheet1), verified against
// the workbook's cached formula results.
//
// A third, distinct methodology from the other templates: no target ladder, no
// Fibonacci ratios — instead a base midpoint "MPT" = (HIGH+LOW)/2, then 5 pairs of
// high/low reference levels each blending MPT (or AVG1/AVG2/OPEN/CLOSE) with the raw
// HIGH or LOW. Column labels below are the source's own (its own C/D columns are
// labeled "HIGH"/"LOW" too, confusingly reusing the raw-input header text for a
// derived value — renamed "Mid High"/"Mid Low" here to disambiguate).
//
// Row 14 ("SILVER CENT") has malformed OPEN/HIGH/CLOSE text values ("21. 06" etc.)
// that error out (#VALUE!) in the source itself, and rows 15-21 are blank placeholder
// rows with no real data — both omitted here, same as the unused rows in the other
// templates. The second "GOLD" (a very different price scale — ~49,268 avg vs
// ~3,557 avg) is labeled "GOLD (Alt)" for clarity, same disambiguation used for
// 90xl-new-2026's repeated SILVER/GOLD/N GAS.

const SYMBOLS = [
  { key: "SILVER", label: "SILVER", group: "MPT", defaults: { open: 87300, high: 254174, low: 87150, close: 235701 } },
  { key: "GOLD", label: "GOLD", group: "MPT", defaults: { open: 2652, high: 4584, low: 2638, close: 4357 } },
  { key: "SIL_MIC", label: "SIL MIC", group: "MPT", defaults: { open: 2919, high: 8250, low: 2821, close: 7089 } },
  { key: "GOLD_ALT", label: "GOLD (Alt)", group: "MPT", defaults: { open: 49035, high: 49589, low: 49007, close: 49443 } },
  { key: "GOLD_GUINEA", label: "GOLD GUNIEA", group: "MPT", defaults: { open: 21.06, high: 24.16, low: 19.89, close: 24.07 } },
  { key: "SILMIC_NXT", label: "SILMIC NXT", group: "MPT", defaults: { open: 720, high: 73970, low: 68720, close: 72043 } },
  { key: "CRUDEOIL", label: "CRUDEOIL", group: "MPT", defaults: { open: 3190, high: 3215, low: 3138, close: 3193 } },
  { key: "COPPER", label: "COPPER", group: "MPT", defaults: { open: 515.2, high: 525.75, low: 514.55, close: 525.3 } },
  { key: "NIFTY_FUT", label: "NIFTY fut", group: "MPT", defaults: { open: 11276.9, high: 11417.45, low: 11261.8, close: 11405.4 } },
  { key: "AXISBANK_FUT", label: "AXISBANKfut", group: "MPT", defaults: { open: 439.85, high: 448.45, low: 436.5, close: 446.3 } },
  { key: "TATASTEEL_FUT", label: "TATASTEELfut", group: "MPT", defaults: { open: 21.06, high: 24.16, low: 19.89, close: 24.07 } },
  { key: "B_NIFTY_FUT", label: "B.NIFTYfut", group: "MPT", defaults: { open: 21743, high: 22272.95, low: 21627.2, close: 22200 } },
];

const GROUPS = [{ key: "MPT", label: "MPT midpoint blend" }];
const GROUP_KEYS = new Set(GROUPS.map((g) => g.key));

const STAT_COLUMNS = [
  { key: "vari", label: "VARI" },
  { key: "avg1", label: "AVG 1" },
  { key: "avg2", label: "AVG 2" },
];

function calculateRow({ key, label }, { open, high, low, close }) {
  const vari = high - low;
  const avg1 = (open + high + low + close) / 4;
  const avg2 = (high + low + close) / 3;
  const mpt = (high + low) / 2;

  const levels = [
    { label: "Mid", highLabel: "Mid High", lowLabel: "Mid Low", high: (mpt + high) / 2, low: (mpt + low) / 2 },
    { label: "MPT", highLabel: "MPTHIGH", lowLabel: "MPTLOW", high: mpt + vari, low: mpt - vari },
    { label: "OH/LC", highLabel: "OH High", lowLabel: "LC Low", high: (open + high) / 2, low: (low + close) / 2 },
    { label: "AVG1", highLabel: "A1 High", lowLabel: "A1 Low", high: (avg1 + high) / 2, low: (avg1 + low) / 2 },
    { label: "AVG2", highLabel: "A2 High", lowLabel: "A2 Low", high: (avg2 + high) / 2, low: (avg2 + low) / 2 },
  ];

  return {
    key,
    label,
    group: "MPT",
    isCustom: !SYMBOLS.some((s) => s.key === key),
    input: { open, high, low, close },
    todayOpen: null,
    block1: { vari, avg1, avg2 },
    mpt,
    levels,
  };
}

function calculate(input = {}) {
  return SYMBOLS.map((symbolDef) => {
    const ohlc = { ...symbolDef.defaults, ...(input[symbolDef.key] || {}) };
    return calculateRow(symbolDef, ohlc);
  });
}

module.exports = {
  id: "2026-new-method-mcx",
  name: "2026 New Method MCX",
  layout: "mpt",
  inputFields: ["open", "high", "low", "close"],
  symbols: SYMBOLS,
  groups: GROUPS,
  isValidGroup: (g) => GROUP_KEYS.has(g),
  statColumns: STAT_COLUMNS,
  calculate,
  calculateRow,
};
