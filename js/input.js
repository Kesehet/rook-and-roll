import { exportConfig, validateImportedState } from "./io.js";
import { createDefaultState, createEnemy, createTrap, canMoveTo, pushLog, rollDice, TILE_TYPES } from "./state.js";
import { renderAll } from "./render.js";
import { runTurn } from "./turnEngine.js";

function deepSet(obj, path, value) {
  const keys = path.split(".");
  const leaf = keys.pop();
  let ref = obj;
  keys.forEach((k) => {
    if (!ref[k]) ref[k] = {};
    ref = ref[k];
  });
  ref[leaf] = value;
}

export function bindEvents(ctx) {
  const { ui, els } = ctx;

  const rerender = () => renderAll(ctx.stateRef.current, ui, els);
  const showToast = (msg, isErr = false) => {
    els.toast.textContent = msg;
    els.toast.className = `toast ${isErr ? "error" : ""} show`;
    setTimeout(() => els.toast.classList.remove("show"), 1800);
  };

  function attemptMove(direction) {
    const state = ctx.stateRef.current;
    const delta = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction];
    if (!delta) return;
    const nx = state.player.x + delta[0];
    const ny = state.player.y + delta[1];
    if (!canMoveTo(state, nx, ny)) return;
    state.player.x = nx;
    state.player.y = ny;
    state.player.dice = rollDice(state.player.dice, direction);
    state.turn.phase = "player";
    pushLog(state, `Player moved ${direction} to (${nx},${ny}).`);
    runTurn(state);
    rerender();
  }

  els.board.addEventListener("click", (event) => {
    const tile = event.target.closest(".tile");
    if (!tile) return;
    const x = Number(tile.dataset.x);
    const y = Number(tile.dataset.y);
    const state = ctx.stateRef.current;

    if (ui.placeEnemyMode && ui.selectedEnemyId) {
      const enemy = state.enemies.find((e) => e.id === ui.selectedEnemyId);
      if (enemy) {
        enemy.x = x;
        enemy.y = y;
        rerender();
      }
      return;
    }

    if (ui.placeTrapMode && ui.selectedTrapId) {
      const trap = state.traps.find((t) => t.id === ui.selectedTrapId);
      if (trap) {
        trap.x = x;
        trap.y = y;
        rerender();
      }
      return;
    }

    const current = state.tiles[y][x];
    state.tiles[y][x] = TILE_TYPES[(TILE_TYPES.indexOf(current) + 1) % TILE_TYPES.length];
    rerender();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "c") {
      ui.isConfigOpen = !ui.isConfigOpen;
      els.configModal.classList.toggle("open", ui.isConfigOpen);
      return;
    }
    if (ui.isConfigOpen) return;
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down" };
    const d = map[event.key] || map[event.key.toLowerCase()];
    if (!d) return;
    event.preventDefault();
    attemptMove(d);
  });

  els.openConfigBtn.onclick = () => { ui.isConfigOpen = true; els.configModal.classList.add("open"); };
  els.closeConfigBtn.onclick = () => { ui.isConfigOpen = false; els.configModal.classList.remove("open"); };
  els.configModal.addEventListener("click", (e) => {
    if (e.target === els.configModal) {
      ui.isConfigOpen = false;
      els.configModal.classList.remove("open");
    }
  });

  els.applyBoardBtn.onclick = () => {
    const rows = Math.max(2, Number(els.rowsInput.value) || 2);
    const cols = Math.max(2, Number(els.colsInput.value) || 2);
    const prev = ctx.stateRef.current;
    const next = createDefaultState(rows, cols);
    next.enemies = prev.enemies.map((e) => ({ ...e, x: Math.min(cols - 1, Math.max(0, e.x)), y: Math.min(rows - 1, Math.max(0, e.y)) }));
    next.traps = prev.traps.map((t) => ({ ...t, x: Math.min(cols - 1, Math.max(0, t.x)), y: Math.min(rows - 1, Math.max(0, t.y)) }));
    next.turn = prev.turn;
    ctx.stateRef.current = next;
    rerender();
  };

  els.addEnemyBtn.onclick = () => {
    const state = ctx.stateRef.current;
    const id = `enemy-${Math.random().toString(36).slice(2, 8)}`;
    state.enemies.push(createEnemy(id));
    ui.selectedEnemyId = id;
    rerender();
  };

  els.addTrapBtn.onclick = () => {
    const state = ctx.stateRef.current;
    const id = `trap-${Math.random().toString(36).slice(2, 8)}`;
    state.traps.push(createTrap(id));
    ui.selectedTrapId = id;
    rerender();
  };

  els.togglePlaceEnemyBtn.onclick = () => { ui.placeEnemyMode = !ui.placeEnemyMode; if (ui.placeEnemyMode) ui.placeTrapMode = false; rerender(); };
  els.togglePlaceTrapBtn.onclick = () => { ui.placeTrapMode = !ui.placeTrapMode; if (ui.placeTrapMode) ui.placeEnemyMode = false; rerender(); };
  els.clearLogBtn.onclick = () => { ctx.stateRef.current.turn.log = []; rerender(); };

  els.exportBtn.onclick = () => exportConfig(ctx.stateRef.current);
  els.importInput.onchange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        validateImportedState(parsed);
        ctx.stateRef.current = parsed;
        showToast("Import successful");
        rerender();
      } catch (err) {
        showToast(`Import error: ${err.message}`, true);
      }
    };
    reader.readAsText(file);
  };

  document.body.addEventListener("click", (e) => {
    const state = ctx.stateRef.current;
    const removeEnemy = e.target.closest("[data-remove-enemy]");
    if (removeEnemy) {
      state.enemies = state.enemies.filter((x) => x.id !== removeEnemy.dataset.removeEnemy);
      rerender();
      return;
    }
    const selectEnemy = e.target.closest("[data-select-enemy]");
    if (selectEnemy) {
      ui.selectedEnemyId = selectEnemy.dataset.selectEnemy;
      rerender();
      return;
    }
    const addRule = e.target.closest("[data-add-rule]");
    if (addRule) {
      const enemy = state.enemies.find((x) => x.id === addRule.dataset.addRule);
      enemy.behavior.rules.push({ name: "New rule", priority: 1, when: [{ type: "always" }], do: [{ type: "wait" }] });
      rerender();
      return;
    }
    const op = e.target.closest("[data-kind]");
    if (op) {
      const enemy = state.enemies.find((x) => x.id === op.dataset.enemy);
      const rule = enemy?.behavior.rules[Number(op.dataset.rule)];
      if (!enemy || !rule) return;
      if (op.dataset.kind === "remove-rule") enemy.behavior.rules.splice(Number(op.dataset.rule), 1);
      if (op.dataset.kind === "add-cond") rule.when.push({ type: "always" });
      if (op.dataset.kind === "add-action") rule.do.push({ type: "wait" });
      if (op.dataset.kind === "remove-cond") rule.when.splice(Number(op.dataset.cond), 1);
      if (op.dataset.kind === "remove-action") rule.do.splice(Number(op.dataset.act), 1);
      rerender();
      return;
    }

    const removeTrap = e.target.closest("[data-remove-trap]");
    if (removeTrap) {
      state.traps = state.traps.filter((x) => x.id !== removeTrap.dataset.removeTrap);
      rerender();
      return;
    }
    const selectTrap = e.target.closest("[data-select-trap]");
    if (selectTrap) {
      ui.selectedTrapId = selectTrap.dataset.selectTrap;
      rerender();
      return;
    }
    const helpToggle = e.target.closest("[data-help='toggle']");
    if (helpToggle) helpToggle.parentElement.classList.toggle("open");
  });

  document.body.addEventListener("input", (e) => {
    const state = ctx.stateRef.current;
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.dataset.enemy && target.dataset.key && !target.dataset.rule) {
      const enemy = state.enemies.find((x) => x.id === target.dataset.enemy);
      if (!enemy) return;
      const key = target.dataset.key;
      let value = target.value;
      if (["x", "y"].includes(key)) value = Number(value);
      if (key === "behaviorState") enemy.behavior.state = value;
      else enemy[key] = value;
      rerender();
      return;
    }

    if (target.dataset.enemy && target.dataset.rule && target.dataset.key) {
      const enemy = state.enemies.find((x) => x.id === target.dataset.enemy);
      const rule = enemy?.behavior.rules[Number(target.dataset.rule)];
      if (!rule) return;
      const key = target.dataset.key;
      let value = target.value;
      if (key === "priority") value = Number(value);
      rule[key] = value;
      rerender();
      return;
    }

    if (target.dataset.rule && target.dataset.cond !== undefined) {
      const enemy = state.enemies.find((x) => x.id === ui.selectedEnemyId) || state.enemies[0];
      const cond = enemy?.behavior.rules[Number(target.dataset.rule)]?.when[Number(target.dataset.cond)];
      if (!cond) return;
      if (target.dataset.kind === "cond-type") cond.type = target.value;
      if (target.dataset.key) cond[target.dataset.key] = /^-?\d+$/.test(target.value) ? Number(target.value) : target.value;
      rerender();
      return;
    }

    if (target.dataset.rule && target.dataset.act !== undefined) {
      const enemy = state.enemies.find((x) => x.id === ui.selectedEnemyId) || state.enemies[0];
      const act = enemy?.behavior.rules[Number(target.dataset.rule)]?.do[Number(target.dataset.act)];
      if (!act) return;
      if (target.dataset.kind === "action-type") act.type = target.value;
      if (target.dataset.key) {
        let v = target.value;
        if (/^-?\d+$/.test(v)) v = Number(v);
        if (v === "true") v = true;
        if (v === "false") v = false;
        act[target.dataset.key] = v;
      }
      rerender();
      return;
    }

    if (target.dataset.trap && target.dataset.key) {
      const trap = state.traps.find((x) => x.id === target.dataset.trap);
      if (!trap) return;
      let v = target.value;
      if (/^-?\d+$/.test(v)) v = Number(v);
      deepSet(trap, target.dataset.key, v);
      rerender();
    }
  });
}
