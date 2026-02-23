import { executeEnemyTurn } from "./behaviorEngine.js";
import { pushLog } from "./state.js";

function trapTriggers(turn, trigger) {
  if (!trigger || trigger.mode !== "turnMod") return false;
  const every = Math.max(1, Number(trigger.every) || 1);
  const offset = Number(trigger.offset) || 0;
  return (turn - offset) % every === 0;
}

export function runTurn(state) {
  state.turn.number += 1;
  state.turn.phase = "traps";

  state.traps.forEach((trap) => {
    trap.activeThisTurn = trapTriggers(state.turn.number, trap.trigger);
    if (!trap.activeThisTurn) return;
    pushLog(state, `Trap ${trap.id} triggered at (${trap.x},${trap.y}).`);
    if (state.player.x === trap.x && state.player.y === trap.y) {
      if (trap.effect?.type === "damage") {
        const dmg = Number(trap.effect.damage) || 1;
        state.player.hp -= dmg;
        pushLog(state, `Player hit by trap ${trap.id} for ${dmg}.`);
      } else {
        pushLog(state, trap.effect?.message || `Trap ${trap.id} affects player.`);
      }
    }
  });

  state.turn.phase = "enemies";
  state.enemies.forEach((enemy) => {
    if (enemy.telegraphCountdown > 0) enemy.telegraphCountdown -= 1;
  });
  [...state.enemies]
    .sort((a, b) => a.id.localeCompare(b.id))
    .forEach((enemy) => executeEnemyTurn(state, enemy));

  state.turn.phase = "end";
}
