// Ported 1:1 from D:\Dad\Original\90 XL VIEW.xlsx (Sheet1), verified against the
// workbook's cached formula results. Unlike 90xl-view-3, this sheet never wraps its
// ladder formulas in ROUND() — values are carried at full precision here too; only the
// UI's display formatting rounds for presentation.
//
// The sheet mixes two independent symbol sets sharing the same two coefficient
// families as 90xl-view-3, but truncated to fewer target levels:
//   "VIEW_A" (rows 2-13): the 12 main instruments, %-of-AVG ladder, 3 targets/side.
//   "VIEW_B" (rows 14-25): COPPER/ZINC/NICKEL/LEAD repeated across Daily/Weekly/Monthly
//     price conventions (much smaller denomination), point-offset ladder, 4 targets/side.

const SYMBOLS = [
  { key: "SILVER", label: "SILVER", group: "VIEW_A", defaults: { open: 44666, high: 44889, low: 44314, close: 44785, todayOpen: 44801 } },
  { key: "SILVER_N", label: "SILVER N", group: "VIEW_A", defaults: { open: 44800, high: 44945, low: 44375, close: 44825, todayOpen: 44770 } },
  { key: "SILVER_M", label: "SILVER M", group: "VIEW_A", defaults: { open: 45790, high: 45955, low: 45400, close: 45829, todayOpen: 45813 } },
  { key: "GOLD", label: "GOLD", group: "VIEW_A", defaults: { open: 29023, high: 29074, low: 28865, close: 29019, todayOpen: 29049 } },
  { key: "GOLDM", label: "GOLDM", group: "VIEW_A", defaults: { open: 29161, high: 29180, low: 29002, close: 29150, todayOpen: 29165 } },
  { key: "OIL", label: "OIL", group: "VIEW_A", defaults: { open: 4710, high: 5824, low: 5688, close: 5823, todayOpen: 5803 } },
  { key: "NGAS", label: "NGAS", group: "VIEW_A", defaults: { open: 26810, high: 27300, low: 26780, close: 27050, todayOpen: 27000 } },
  { key: "SILVERMIC", label: "SILVERMIC", group: "VIEW_A", defaults: { open: 44900, high: 44939, low: 44361, close: 44822, todayOpen: 44822 } },
  { key: "COPPER", label: "COPPER", group: "VIEW_A", defaults: { open: 45490, high: 46025, low: 45230, close: 45985, todayOpen: 45995 } },
  { key: "ZINC", label: "ZINC", group: "VIEW_A", defaults: { open: 12710, high: 12890, low: 12620, close: 12860, todayOpen: 12865 } },
  { key: "NKL", label: "NKL", group: "VIEW_A", defaults: { open: 87970, high: 89800, low: 87330, close: 89320, todayOpen: 89690 } },
  { key: "LEAD", label: "LEAD", group: "VIEW_A", defaults: { open: 13370, high: 13620, low: 13215, close: 13575, todayOpen: 13570 } },

  { key: "COPPER_DAILY", label: "COPPER (Daily)", group: "VIEW_B", defaults: { open: 454.9, high: 460.25, low: 452.3, close: 459.85, todayOpen: 459.95 } },
  { key: "ZINC_DAILY", label: "ZINC (Daily)", group: "VIEW_B", defaults: { open: 127.1, high: 128.9, low: 126.2, close: 128.6, todayOpen: 128.65 } },
  { key: "NICKEL_DAILY", label: "NICKEL (Daily)", group: "VIEW_B", defaults: { open: 879.7, high: 898, low: 873.3, close: 893.2, todayOpen: 896.9 } },
  { key: "LEAD_DAILY", label: "LEAD (Daily)", group: "VIEW_B", defaults: { open: 133.7, high: 136.2, low: 132.15, close: 135.75, todayOpen: 135.7 } },
  { key: "COPPER_WEEKLY", label: "COPPER (Weekly)", group: "VIEW_B", defaults: { open: 467.6, high: 467.9, low: 453.6, close: 457.45, todayOpen: 458.25 } },
  { key: "ZINC_WEEKLY", label: "ZINC (Weekly)", group: "VIEW_B", defaults: { open: 127.4, high: 128.15, low: 124.45, close: 125.6, todayOpen: 126 } },
  { key: "NICKEL_WEEKLY", label: "NICKEL (Weekly)", group: "VIEW_B", defaults: { open: 867.5, high: 869.3, low: 830.4, close: 851.4, todayOpen: 852.2 } },
  { key: "LEAD_WEEKLY", label: "LEAD (Weekly)", group: "VIEW_B", defaults: { open: 135.5, high: 135.8, low: 129.35, close: 130.1, todayOpen: 130.35 } },
  { key: "COPPER_MONTHLY", label: "COPPER (Monthly)", group: "VIEW_B", defaults: { open: 463.55, high: 470.9, low: 441, close: 450.85, todayOpen: null } },
  { key: "ZINC_MONTHLY", label: "ZINC (Monthly)", group: "VIEW_B", defaults: { open: 121.7, high: 122.5, low: 115.9, close: 117.1, todayOpen: null } },
  { key: "NICKEL_MONTHLY", label: "NICKEL (Monthly)", group: "VIEW_B", defaults: { open: 915.3, high: 921.9, low: 835.7, close: 848.4, todayOpen: null } },
  { key: "LEAD_MONTHLY", label: "LEAD (Monthly)", group: "VIEW_B", defaults: { open: 136.1, high: 137.85, low: 128.7, close: 129.65, todayOpen: null } },
];

const GROUPS = [
  { key: "VIEW_A", label: "Standard (% ladder, 3 targets/side)" },
  { key: "VIEW_B", label: "Point-offset ladder, 4 targets/side (Copper/base-metal style)" },
];
const GROUP_KEYS = new Set(GROUPS.map((g) => g.key));

function calculateBlock1({ open, high, low, close }) {
  return {
    avg: (open + high + low + close) / 4,
    varHL: high - low,
  };
}

function calculateBlock2Group(group, { open, high, low, close }, avg) {
  if (group === "VIEW_A") {
    const buyAbove = open * 0.003161 + avg;
    const tgt1 = avg * 0.002 + buyAbove;
    const tgt2 = avg * 0.00237 + tgt1;
    const tgt3 = avg * 0.00277 + tgt2;
    const stopLoss = avg - 7;
    const sellBelow = avg - avg * 0.003967;
    const dTgt1 = avg - avg * 0.007;
    const dTgt2 = avg - avg * 0.00937;
    const dTgt3 = avg - avg * 0.0122;
    const stopLossSell = avg + 3;
    return {
      buyAbove,
      targetsUp: [tgt1, tgt2, tgt3],
      stopLoss,
      sellBelow,
      targetsDown: [dTgt1, dTgt2, dTgt3],
      stopLossSell,
    };
  }

  // "VIEW_B"
  const buyAbove = (high + close) / 2 + 0.2;
  const tgt1 = buyAbove + 0.6;
  const tgt2 = tgt1 + 1.2;
  const tgt3 = tgt2 + 1.4;
  const tgt4 = tgt3 + 2.3;
  const stopLoss = avg - 0.2;
  const sellBelow = (low + close) / 2 - 0.2;
  const dTgt1 = sellBelow - 1.2;
  const dTgt2 = dTgt1 - 1.2;
  const dTgt3 = dTgt2 - 1.2;
  const dTgt4 = dTgt3 - 2.3;
  const stopLossSell = avg + 1;
  return {
    buyAbove,
    targetsUp: [tgt1, tgt2, tgt3, tgt4],
    stopLoss,
    sellBelow,
    targetsDown: [dTgt1, dTgt2, dTgt3, dTgt4],
    stopLossSell,
  };
}

function calculateRow({ key, label, group, todayOpen = null }, ohlc) {
  const block1 = calculateBlock1(ohlc);
  const block2 = calculateBlock2Group(group, ohlc, block1.avg);
  return {
    key,
    label,
    group,
    isCustom: !SYMBOLS.some((s) => s.key === key),
    input: ohlc,
    todayOpen: ohlc.todayOpen ?? todayOpen,
    block1,
    block2,
  };
}

function calculate(input = {}) {
  return SYMBOLS.map((symbolDef) => {
    const ohlc = { ...symbolDef.defaults, ...(input[symbolDef.key] || {}) };
    return calculateRow(symbolDef, ohlc);
  });
}

const STAT_COLUMNS = [
  { key: "avg", label: "AVG" },
  { key: "varHL", label: "VAR" },
  { key: "todayOpen", label: "TODAY OPEN" },
];

module.exports = {
  id: "90xl-view",
  name: "90 XL View",
  layout: "ladder",
  inputFields: ["open", "high", "low", "close"],
  symbols: SYMBOLS,
  groups: GROUPS,
  statColumns: STAT_COLUMNS,
  isValidGroup: (g) => GROUP_KEYS.has(g),
  calculate,
  calculateRow,
};
