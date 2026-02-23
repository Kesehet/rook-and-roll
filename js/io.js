import { createDefaultState } from "./state.js";

export function exportConfig(state) {
  const payload = JSON.stringify(state, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const pad = (v) => String(v).padStart(2, "0");
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  const a = document.createElement("a");
  a.href = url;
  a.download = `config_${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function fail(msg) {
  throw new Error(msg);
}

export function validateImportedState(parsed) {
  if (!parsed || typeof parsed !== "object") fail("Root JSON must be an object");
  if (!parsed.config || typeof parsed.config.rows !== "number" || typeof parsed.config.cols !== "number") fail("Missing config.rows/config.cols numbers");
  if (!Array.isArray(parsed.tiles) || parsed.tiles.length !== parsed.config.rows) fail("tiles must match row count");
  if (!parsed.player || typeof parsed.player.x !== "number" || typeof parsed.player.y !== "number") fail("Missing player coordinates");
  if (!Array.isArray(parsed.enemies)) fail("enemies must be an array");
  if (!Array.isArray(parsed.traps)) parsed.traps = [];
  if (!parsed.turn) parsed.turn = createDefaultState(parsed.config.rows, parsed.config.cols).turn;
  parsed.enemies.forEach((e, i) => {
    if (!e.id) fail(`enemy[${i}] missing id`);
    if (!e.behavior || !Array.isArray(e.behavior.rules)) fail(`enemy[${i}] missing behavior.rules[]`);
  });
  parsed.traps.forEach((t, i) => {
    if (!t.id) fail(`trap[${i}] missing id`);
    if (!t.trigger || t.trigger.mode !== "turnMod") fail(`trap[${i}] trigger.mode must be turnMod`);
  });
}
