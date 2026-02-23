import { canMoveTo, pushLog } from "./state.js";

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function clearLine(state, from, to, mode) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const adx = Math.abs(dx);
  const ady = Math.abs(dy);
  const rook = dx === 0 || dy === 0;
  const bishop = adx === ady;
  if ((mode === "rook" && !rook) || (mode === "bishop" && !bishop) || (mode === "queen" && !(rook || bishop))) return false;
  const sx = dx === 0 ? 0 : dx / adx;
  const sy = dy === 0 ? 0 : dy / ady;
  let x = from.x + sx;
  let y = from.y + sy;
  while (x !== to.x || y !== to.y) {
    if (!canMoveTo(state, x, y)) return false;
    x += sx;
    y += sy;
  }
  return true;
}

function matchCondition(state, enemy, condition) {
  switch (condition.type) {
    case "always":
      return true;
    case "turnMod": {
      const every = Math.max(1, Number(condition.every) || 1);
      const offset = Number(condition.offset) || 0;
      return (state.turn.number - offset) % every === 0;
    }
    case "playerInRangeManhattan":
      return manhattan(enemy, state.player) <= (Number(condition.range) || 1);
    case "playerInLine":
      return clearLine(state, enemy, state.player, condition.mode || "rook");
    case "enemyStateIs":
      return enemy.behavior.state === condition.value;
    default:
      return false;
  }
}

function moveEnemy(state, enemy, nx, ny) {
  if (!canMoveTo(state, nx, ny)) return false;
  if (state.enemies.some((e) => e.id !== enemy.id && e.x === nx && e.y === ny)) return false;
  enemy.x = nx;
  enemy.y = ny;
  return true;
}

function randomMove(state, enemy, allowDiagonal) {
  const deltas = allowDiagonal
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
    : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (const [dx, dy] of deltas.sort(() => Math.random() - 0.5)) {
    if (moveEnemy(state, enemy, enemy.x + dx, enemy.y + dy)) return true;
  }
  return false;
}

function towardDelta(enemy, player, movement) {
  const dx = Math.sign(player.x - enemy.x);
  const dy = Math.sign(player.y - enemy.y);
  if (movement === "rook") return Math.abs(player.x - enemy.x) >= Math.abs(player.y - enemy.y) ? [dx, 0] : [0, dy];
  if (movement === "bishop") return [dx, dy];
  if (movement === "queen") return Math.abs(player.x - enemy.x) === 0 || Math.abs(player.y - enemy.y) === 0 ? [dx, dy] : [dx, dy];
  if (movement === "knight") {
    const choices = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
    choices.sort((a, b) => {
      const da = Math.abs(player.x - (enemy.x + a[0])) + Math.abs(player.y - (enemy.y + a[1]));
      const db = Math.abs(player.x - (enemy.x + b[0])) + Math.abs(player.y - (enemy.y + b[1]));
      return da - db;
    });
    return choices[0];
  }
  return [0, 0];
}

function performAction(state, enemy, action) {
  switch (action.type) {
    case "setState":
      enemy.behavior.state = action.value || "idle";
      pushLog(state, `${enemy.id} state -> ${enemy.behavior.state}`);
      return;
    case "wait":
      pushLog(state, `${enemy.id} waits.`);
      return;
    case "moveTowardPlayer": {
      const steps = Math.max(1, Number(action.steps) || 1);
      for (let i = 0; i < steps; i += 1) {
        const [dx, dy] = towardDelta(enemy, state.player, action.movement || "rook");
        if (!moveEnemy(state, enemy, enemy.x + dx, enemy.y + dy)) break;
      }
      pushLog(state, `${enemy.id} moved toward player to (${enemy.x},${enemy.y}).`);
      return;
    }
    case "moveRandom": {
      const steps = Math.max(1, Number(action.steps) || 1);
      for (let i = 0; i < steps; i += 1) randomMove(state, enemy, !!action.allowDiagonal);
      pushLog(state, `${enemy.id} moved randomly to (${enemy.x},${enemy.y}).`);
      return;
    }
    case "moveByVector": {
      moveEnemy(state, enemy, enemy.x + (Number(action.dx) || 0), enemy.y + (Number(action.dy) || 0));
      pushLog(state, `${enemy.id} vector move to (${enemy.x},${enemy.y}).`);
      return;
    }
    case "telegraph":
      enemy.telegraphCountdown = Math.max(1, Number(action.turns) || 1);
      enemy.telegraphMarker = action.marker || "⚠️";
      pushLog(state, `${enemy.id} telegraphs for ${enemy.telegraphCountdown} turn(s).`);
      return;
    case "attackPlayer":
      pushLog(state, `${enemy.id} uses ${action.attackType || "melee"} attack${action.damage ? ` (${action.damage})` : ""}.`);
      return;
    case "log":
      pushLog(state, `${enemy.id}: ${action.message || "..."}`);
      return;
    default:
      pushLog(state, `${enemy.id} unknown action ${action.type}`);
  }
}

export function executeEnemyTurn(state, enemy) {
  const rules = [...(enemy.behavior.rules || [])].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  const match = rules.find((rule) => (rule.when || []).every((c) => matchCondition(state, enemy, c)));
  if (!match) {
    pushLog(state, `${enemy.id} has no matching rule.`);
    return;
  }
  pushLog(state, `Enemy ${enemy.id} matched rule "${match.name || "unnamed"}"`);
  const actions = (match.do || []).slice(0, 10);
  actions.forEach((action) => performAction(state, enemy, action));
}

export function ruleSummary(rule) {
  const cond = (rule.when || []).map((c) => c.type).join(" & ") || "(none)";
  const acts = (rule.do || []).map((a) => a.type).join(" -> ") || "(none)";
  return `P${rule.priority ?? 0}: IF ${cond} THEN ${acts}`;
}
