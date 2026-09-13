// Template registry: to add a new calculator, drop a new module in this folder
// (same shape as 90xl-view-3.js: { id, name, symbols, calculate }) and add it here.
// No other server code needs to change.
const view3 = require("./90xl-view-3");
const view = require("./90xl-view");
const view5 = require("./90xl-view-5");
const new2026 = require("./90xl-new-2026");
const mcx2026 = require("./2026-new-method-mcx");
const xl2020 = require("./2020-xl");

const REGISTRY = [view3, view, view5, new2026, mcx2026, xl2020];

function listTemplates() {
  return REGISTRY.map((t) => ({ id: t.id, name: t.name }));
}

function getTemplate(id) {
  return REGISTRY.find((t) => t.id === id) || null;
}

module.exports = { listTemplates, getTemplate };
