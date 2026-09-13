// Template registry: to add a new calculator, drop a new module in this folder
// (same shape as 90xl-view-3.js: { id, name, symbols, calculate }) and add it here.
// No other server code needs to change.
const view3 = require("./90xl-view-3");

const REGISTRY = [view3];

function listTemplates() {
  return REGISTRY.map((t) => ({ id: t.id, name: t.name }));
}

function getTemplate(id) {
  return REGISTRY.find((t) => t.id === id) || null;
}

module.exports = { listTemplates, getTemplate };
