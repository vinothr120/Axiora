// Ported 1:1 from D:\Dad\Original\90 XL VIEW 3..xlsx (Sheet1), verified against the
// workbook's cached formula results. Do not simplify/refactor the coefficients below —
// they are the client's proprietary trading-level formulas.

// Matches Excel's ROUND(), which corrects for binary floating-point noise near
// halfway points (e.g. (172.45+172.1)/2+0.2 lands on 172.47499999999997 in IEEE754,
// but Excel still rounds it to 172.48 — the toPrecision(12) strips that noise first).
function round(value, decimals) {
  const clean = Number(value.toPrecision(12));
  return Number(`${Math.round(Number(`${clean}e${decimals}`))}e${-decimals}`);
}

// group "A": SILVER..NIFTY — percentage-of-AVG ladder, all rounded to whole numbers.
// group "A_OFFSET": OIL / OIL M (crude oil) — same as A for buy-side/sell-side steps 1-3,
//   but steps 4-5 switch to fixed point offsets (price scale is too small for the % steps).
// group "B": COPPER..G MARK — fixed point-offset ladder throughout, rounded to 2 decimals,
//   and carries a 6th target level that group A does not have.
const SYMBOLS = [
  { key: "SILVER", label: "SILVER", group: "A", defaults: { open: 38726, high: 38852, low: 38615, close: 38786, todayOpen: 38079 } },
  { key: "SILVERM", label: "SILVERM", group: "A", defaults: { open: 38830, high: 38850, low: 38701, close: 38814, todayOpen: 38075 } },
  { key: "SIL_MIC", label: "SIL MIC", group: "A", defaults: { open: 38760, high: 38865, low: 38709, close: 38812, todayOpen: 38198 } },
  { key: "GOLD", label: "GOLD", group: "A", defaults: { open: 31409, high: 31461, low: 31357, close: 31422, todayOpen: 29696 } },
  { key: "GOLDM", label: "GOLDM", group: "A", defaults: { open: 31422, high: 31473, low: 31376, close: 31428, todayOpen: 29625 } },
  { key: "NIFTY", label: "NIFTY", group: "A", defaults: { open: 10869, high: 10895, low: 10735, close: 10793, todayOpen: null } },
  { key: "OIL", label: "OIL", group: "A_OFFSET", defaults: { open: 3208, high: 3212, low: 3152, close: 3177, todayOpen: 4608 } },
  { key: "OIL_M", label: "OIL M", group: "A_OFFSET", defaults: { open: 3181, high: 3209, low: 3155, close: 3177, todayOpen: 4594 } },
  { key: "COPPER", label: "COPPER", group: "B", defaults: { open: 409.95, high: 409.95, low: 406.8, close: 407.7, todayOpen: 421.55 } },
  { key: "COPPER_M", label: "COPPER M", group: "B", defaults: { open: 408.6, high: 409.4, low: 406.85, close: 407.75, todayOpen: 421.8 } },
  { key: "NICKEL", label: "NICKEL", group: "B", defaults: { open: 745.9, high: 745.9, low: 735.2, close: 740.9, todayOpen: 956.9 } },
  { key: "NICKEL_M", label: "NICKEL M", group: "B", defaults: { open: 743.3, high: 743.3, low: 733.3, close: 741.6, todayOpen: 956.8 } },
  { key: "ZINC", label: "ZINC", group: "B", defaults: { open: 172.35, high: 172.45, low: 171.6, close: 172.1, todayOpen: 151.7 } },
  { key: "LEAD", label: "LEAD", group: "B", defaults: { open: 139.8, high: 140.65, low: 139.35, close: 140.2, todayOpen: 122.3 } },
  { key: "N_GAS", label: "N GAS", group: "B", defaults: { open: 204.3, high: 212.7, low: 204, close: 207, todayOpen: 714 } },
  { key: "B_FORG", label: "B FORG", group: "B", defaults: { open: 510, high: 510.75, low: 492, close: 494.9, todayOpen: 152.1 } },
  { key: "G_MARK", label: "G MARK", group: "B", defaults: { open: 691.8, high: 691.8, low: 673.05, close: 683.05, todayOpen: 169.6 } },
];

function calculateBlock1({ open, high, low, close }) {
  return {
    hlcA: (high + low + close) / 3,
    avg: (open + high + low + close) / 4,
    varHL: high - low,
    lowClose: low - close,
  };
}

function calculateBlock2Group(group, { open, high, low, close }, avg) {
  if (group === "A" || group === "A_OFFSET") {
    const buyAbv = round(open * 0.003161 + avg, 0);
    const tgt1 = round(avg * 0.002 + buyAbv, 0);
    const tgt2 = round(avg * 0.00237 + tgt1, 0);
    const tgt3 = round(avg * 0.00277 + tgt2, 0);
    const sl = round(avg - 7, 0);
    const sellBlw = round(avg - avg * 0.003967, 0);
    const dTgt1 = round(avg - avg * 0.007, 0);
    const dTgt2 = round(avg - avg * 0.00937, 0);
    const dTgt3 = round(avg - avg * 0.0122, 0);

    const dSl = round(avg + 3, 0);
    let tgt4, tgt5, dTgt4, dTgt5;
    if (group === "A_OFFSET") {
      tgt4 = tgt3 + 19;
      tgt5 = tgt4 + 38;
      dTgt4 = dTgt3 - 19;
      dTgt5 = dTgt4 - 38;
    } else {
      tgt4 = round(avg * 0.00287 + tgt3, 0);
      tgt5 = avg * 0.00297 + tgt4;
      dTgt4 = round(avg - avg * 0.0142, 0);
      dTgt5 = avg - avg * 0.0182;
    }

    return {
      buyAbove: buyAbv,
      targetsUp: [tgt1, tgt2, tgt3, tgt4, tgt5],
      stopLoss: sl,
      sellBelow: sellBlw,
      targetsDown: [dTgt1, dTgt2, dTgt3, dTgt4, dTgt5],
      stopLossSell: dSl,
    };
  }

  // group "B"
  const buyAbv = round((high + close) / 2 + 0.2, 2);
  const tgt1 = round(buyAbv + 0.6, 2);
  const tgt2 = round(tgt1 + 1.2, 2);
  const tgt3 = round(tgt2 + 1.4, 2);
  const tgt4 = round(tgt3 + 2.3, 2);
  const tgt5 = round(tgt4 + 3.2, 2);
  const tgt6 = round(tgt5 + 4.4, 2);
  const sl = round(avg - 0.2, 2);
  const sellBlw = round((low + close) / 2 - 0.2, 2);
  const dTgt1 = round(sellBlw - 1.2, 2);
  const dTgt2 = round(dTgt1 - 1.2, 2);
  const dTgt3 = round(dTgt2 - 1.2, 2);
  const dTgt4 = round(dTgt3 - 2.3, 2);
  const dTgt5 = round(dTgt4 - 3.2, 2);
  const dTgt6 = round(dTgt5 - 4.4, 2);
  const dSl = round(avg + 1, 2);

  return {
    buyAbove: buyAbv,
    targetsUp: [tgt1, tgt2, tgt3, tgt4, tgt5, tgt6],
    stopLoss: sl,
    sellBelow: sellBlw,
    targetsDown: [dTgt1, dTgt2, dTgt3, dTgt4, dTgt5, dTgt6],
    stopLossSell: dSl,
  };
}

const GROUPS = [
  { key: "A", label: "Standard (% ladder — Silver/Gold/Nifty style)" },
  { key: "A_OFFSET", label: "Crude-oil style (hybrid % + point ladder)" },
  { key: "B", label: "Point-offset ladder (Copper/base-metal style)" },
];
const GROUP_KEYS = new Set(GROUPS.map((g) => g.key));

// Reusable for both the built-in symbol board and user-added custom rows — a custom
// row is just { key, label, group } with no preset defaults/todayOpen.
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

// input: { [symbolKey]: { open, high, low, close } } — partial map, missing symbols use defaults.
function calculate(input = {}) {
  return SYMBOLS.map((symbolDef) => {
    const ohlc = { ...symbolDef.defaults, ...(input[symbolDef.key] || {}) };
    return calculateRow(symbolDef, ohlc);
  });
}

const STAT_COLUMNS = [
  { key: "hlcA", label: "HLC A" },
  { key: "avg", label: "AVG" },
  { key: "varHL", label: "H-L" },
  { key: "todayOpen", label: "TODAY OPEN" },
  { key: "lowClose", label: "L-C" },
];

module.exports = {
  id: "90xl-view-3",
  name: "90 XL View 3",
  layout: "ladder",
  inputFields: ["open", "high", "low", "close"],
  symbols: SYMBOLS,
  groups: GROUPS,
  statColumns: STAT_COLUMNS,
  isValidGroup: (g) => GROUP_KEYS.has(g),
  calculate,
  calculateRow,
};
