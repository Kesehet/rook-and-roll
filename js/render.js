import { rollDice } from "./state.js";
import { ruleSummary } from "./behaviorEngine.js";
import { ACTION_TYPES, BEHAVIOR_HELP, CONDITION_TYPES } from "./uiConfig.js";

export function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function conditionEditor(cond, ruleIndex, condIndex) {
  return `<div class="rule-card">\
  <div class="row"><div class="field"><label>Condition Type</label><select data-rule='${ruleIndex}' data-cond='${condIndex}' data-kind='cond-type'>${CONDITION_TYPES.map((c) => `<option value='${c}' ${c === cond.type ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>\
  <div class='row'>${cond.type === "turnMod" ? `<div class='field'><label title='Turn number - offset must be divisible by every'>every</label><input data-rule='${ruleIndex}' data-cond='${condIndex}' data-key='every' type='number' value='${cond.every ?? 2}'></div><div class='field'><label title='Offset shifts cadence'>offset</label><input data-rule='${ruleIndex}' data-cond='${condIndex}' data-key='offset' type='number' value='${cond.offset ?? 0}'></div>` : ""}${cond.type === "playerInRangeManhattan" ? `<div class='field'><label>range</label><input data-rule='${ruleIndex}' data-cond='${condIndex}' data-key='range' type='number' value='${cond.range ?? 1}'></div>` : ""}${cond.type === "playerInLine" ? `<div class='field'><label>mode</label><select data-rule='${ruleIndex}' data-cond='${condIndex}' data-key='mode'><option ${cond.mode === "rook" ? "selected" : ""}>rook</option><option ${cond.mode === "bishop" ? "selected" : ""}>bishop</option><option ${cond.mode === "queen" ? "selected" : ""}>queen</option></select></div>` : ""}${cond.type === "enemyStateIs" ? `<div class='field'><label>value</label><input data-rule='${ruleIndex}' data-cond='${condIndex}' data-key='value' value='${escapeHtml(cond.value ?? "idle")}'></div>` : ""}</div>\
  <button class='danger' data-rule='${ruleIndex}' data-cond='${condIndex}' data-kind='remove-cond'>Remove Condition</button></div>`;
}

function actionEditor(action, ruleIndex, actionIndex) {
  return `<div class='rule-card'><div class='row'><div class='field'><label>Action Type</label><select data-rule='${ruleIndex}' data-act='${actionIndex}' data-kind='action-type'>${ACTION_TYPES.map((c) => `<option value='${c}' ${c === action.type ? "selected" : ""}>${c}</option>`).join("")}</select></div></div>
<div class='row'>${action.type === "setState" ? `<div class='field'><label>value</label><input data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='value' value='${escapeHtml(action.value ?? "idle")}'></div>` : ""}
${action.type === "moveTowardPlayer" ? `<div class='field'><label>movement</label><select data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='movement'><option ${action.movement === "rook" ? "selected" : ""}>rook</option><option ${action.movement === "bishop" ? "selected" : ""}>bishop</option><option ${action.movement === "queen" ? "selected" : ""}>queen</option><option ${action.movement === "knight" ? "selected" : ""}>knight</option></select></div><div class='field'><label>steps</label><input type='number' data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='steps' value='${action.steps ?? 1}'></div>` : ""}
${action.type === "moveRandom" ? `<div class='field'><label>steps</label><input type='number' data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='steps' value='${action.steps ?? 1}'></div><div class='field'><label>allowDiagonal</label><select data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='allowDiagonal'><option value='true' ${action.allowDiagonal ? "selected" : ""}>true</option><option value='false' ${!action.allowDiagonal ? "selected" : ""}>false</option></select></div>` : ""}
${action.type === "moveByVector" ? `<div class='field'><label>dx</label><input type='number' data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='dx' value='${action.dx ?? 0}'></div><div class='field'><label>dy</label><input type='number' data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='dy' value='${action.dy ?? 0}'></div>` : ""}
${action.type === "telegraph" ? `<div class='field'><label>turns</label><input type='number' data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='turns' value='${action.turns ?? 1}'></div><div class='field'><label>marker</label><input data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='marker' value='${escapeHtml(action.marker ?? "⚠️")}'></div>` : ""}
${action.type === "attackPlayer" ? `<div class='field'><label>type</label><select data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='attackType'><option value='melee' ${action.attackType === "melee" ? "selected" : ""}>melee</option><option value='ranged' ${action.attackType === "ranged" ? "selected" : ""}>ranged</option></select></div><div class='field'><label>damage</label><input type='number' data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='damage' value='${action.damage ?? 1}'></div>` : ""}
${action.type === "log" ? `<div class='field'><label>message</label><input data-rule='${ruleIndex}' data-act='${actionIndex}' data-key='message' value='${escapeHtml(action.message ?? "")}'></div>` : ""}</div>
<button class='danger' data-rule='${ruleIndex}' data-act='${actionIndex}' data-kind='remove-action'>Remove Action</button></div>`;
}

export function renderAll(state, ui, els) {
  renderBoard(state, ui, els);
  renderPreview(state, els);
  renderEditor(state, ui, els);
  renderTurnAndLog(state, els);
}

export function renderTurnAndLog(state, els) {
  els.turnIndicator.textContent = `Turn: ${state.turn.number}`;
  els.eventLog.innerHTML = [...state.turn.log].reverse().map((line) => `<div class='log-item'>${escapeHtml(line)}</div>`).join("");
}

function renderBoard(state, ui, els) {
  els.board.style.setProperty("--rows", state.config.rows);
  els.board.style.setProperty("--cols", state.config.cols);
  const frag = document.createDocumentFragment();
  for (let y = 0; y < state.config.rows; y += 1) {
    for (let x = 0; x < state.config.cols; x += 1) {
      const tile = document.createElement("button");
      tile.className = `tile ${state.tiles[y][x]}`;
      tile.dataset.x = String(x);
      tile.dataset.y = String(y);
      const trap = state.traps.find((t) => t.x === x && t.y === y);
      const enemy = state.enemies.find((e) => e.x === x && e.y === y);
      if (trap) {
        const el = document.createElement("div");
        el.className = `trap ${trap.activeThisTurn ? "active-turn" : ""}`;
        el.textContent = trap.icon || "☠️";
        tile.appendChild(el);
      }
      if (enemy) {
        const el = document.createElement("div");
        el.className = "enemy";
        el.textContent = `${enemy.icon || "👾"}${enemy.telegraphCountdown > 0 ? ` ${enemy.telegraphMarker}` : ""}`;
        tile.appendChild(el);
      }
      if (state.player.x === x && state.player.y === y) {
        const p = document.createElement("div");
        p.className = "player";
        p.textContent = state.player.dice.top;
        tile.appendChild(p);
      }
      frag.appendChild(tile);
    }
  }
  els.board.replaceChildren(frag);
}

function renderPreview(state, els) {
  const d = state.player.dice;
  const entries = [["Current Top", d.top], ["Up", rollDice(d, "up").top], ["Down", rollDice(d, "down").top], ["Left", rollDice(d, "left").top], ["Right", rollDice(d, "right").top], ["HP", state.player.hp]];
  els.previewBar.innerHTML = entries.map(([l, v]) => `<div class='preview-item'><strong>${l}</strong><div>${v}</div></div>`).join("");
}

function renderEditor(state, ui, els) {
  els.rowsInput.value = String(state.config.rows);
  els.colsInput.value = String(state.config.cols);
  els.togglePlaceEnemyBtn.textContent = `Place Enemy Mode: ${ui.placeEnemyMode ? "On" : "Off"}`;
  els.togglePlaceTrapBtn.textContent = `Place Trap Mode: ${ui.placeTrapMode ? "On" : "Off"}`;

  els.enemyList.innerHTML = "";
  state.enemies.forEach((enemy) => {
    const card = document.createElement("div");
    card.className = "enemy-card";
    card.innerHTML = `<div class='enemy-head'><strong>${escapeHtml(enemy.icon)} ${enemy.id}</strong><button class='danger' data-remove-enemy='${enemy.id}'>Remove</button></div>
      <div class='row'>
        <div class='field'><label>Type</label><input data-enemy='${enemy.id}' data-key='type' value='${escapeHtml(enemy.type)}'></div>
        <div class='field'><label>Icon</label><input data-enemy='${enemy.id}' data-key='icon' value='${escapeHtml(enemy.icon)}'></div>
        <div class='field'><label>X</label><input type='number' data-enemy='${enemy.id}' data-key='x' value='${enemy.x}'></div>
        <div class='field'><label>Y</label><input type='number' data-enemy='${enemy.id}' data-key='y' value='${enemy.y}'></div>
        <div class='field'><label>Behavior State</label><input data-enemy='${enemy.id}' data-key='behaviorState' value='${escapeHtml(enemy.behavior.state)}'></div>
      </div>
      <div class='toolbar-row'><button class='secondary' data-select-enemy='${enemy.id}'>${ui.selectedEnemyId === enemy.id ? "Selected" : "Select"}</button>
      <button data-add-rule='${enemy.id}'>Add Rule</button></div>
      <div class='info-wrap'><strong>Behavior Rules</strong><button class='info-btn secondary' data-help='toggle'>i</button><div class='info-pop'>${escapeHtml(BEHAVIOR_HELP).replaceAll("\n", "<br>")}</div></div>
      <div class='stack'>${enemy.behavior.rules.map((rule, i) => `<div class='rule-card'>
        <div class='row'>
          <div class='field'><label>Name</label><input data-enemy='${enemy.id}' data-rule='${i}' data-key='name' value='${escapeHtml(rule.name)}'></div>
          <div class='field'><label>Priority</label><input type='number' data-enemy='${enemy.id}' data-rule='${i}' data-key='priority' value='${rule.priority ?? 0}'></div>
        </div>
        <div>${escapeHtml(ruleSummary(rule))}</div>
        <div class='toolbar-row'><button class='secondary' data-enemy='${enemy.id}' data-rule='${i}' data-kind='add-cond'>Add Condition</button><button class='secondary' data-enemy='${enemy.id}' data-rule='${i}' data-kind='add-action'>Add Action</button><button class='danger' data-enemy='${enemy.id}' data-rule='${i}' data-kind='remove-rule'>Remove Rule</button></div>
        <div class='stack'>${(rule.when || []).map((c, ci) => conditionEditor(c, i, ci)).join("")}</div>
        <div class='stack'>${(rule.do || []).map((a, ai) => actionEditor(a, i, ai)).join("")}</div>
      </div>`).join("")}</div>`;
    els.enemyList.appendChild(card);
  });

  els.trapList.innerHTML = "";
  state.traps.forEach((trap) => {
    const card = document.createElement("div");
    card.className = "trap-card";
    card.innerHTML = `<div class='enemy-head'><strong>${trap.icon} ${trap.id}</strong><button class='danger' data-remove-trap='${trap.id}'>Remove</button></div>
      <div class='row'><div class='field'><label>Type</label><input data-trap='${trap.id}' data-key='type' value='${escapeHtml(trap.type)}'></div><div class='field'><label>Icon</label><input data-trap='${trap.id}' data-key='icon' value='${escapeHtml(trap.icon)}'></div><div class='field'><label>X</label><input type='number' data-trap='${trap.id}' data-key='x' value='${trap.x}'></div><div class='field'><label>Y</label><input type='number' data-trap='${trap.id}' data-key='y' value='${trap.y}'></div></div>
      <div class='row'><div class='field'><label title='Trigger every N turns'>Trigger every</label><input type='number' data-trap='${trap.id}' data-key='trigger.every' value='${trap.trigger.every}'></div><div class='field'><label title='turnMod offset shifts cadence'>Offset</label><input type='number' data-trap='${trap.id}' data-key='trigger.offset' value='${trap.trigger.offset ?? 0}'></div><div class='field'><label>Effect Type</label><select data-trap='${trap.id}' data-key='effect.type'><option value='damage' ${trap.effect.type === "damage" ? "selected" : ""}>damage</option><option value='log' ${trap.effect.type === "log" ? "selected" : ""}>log</option></select></div><div class='field'><label>Damage</label><input type='number' data-trap='${trap.id}' data-key='effect.damage' value='${trap.effect.damage ?? 1}'></div><div class='field'><label>Message</label><input data-trap='${trap.id}' data-key='effect.message' value='${escapeHtml(trap.effect.message ?? "")}'></div></div>
      <button class='secondary' data-select-trap='${trap.id}'>${ui.selectedTrapId === trap.id ? "Selected" : "Select"}</button>`;
    els.trapList.appendChild(card);
  });
}
