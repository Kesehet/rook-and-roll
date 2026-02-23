export const TILE_TYPES = ["ground", "wall", "blank"];
export const DEFAULT_DICE = { top: 1, bottom: 6, left: 4, right: 3, front: 2, back: 5 };

export function defaultEnemyRuleSet() {
  return [
    { name: "Default wait", priority: 1, when: [{ type: "always" }], do: [{ type: "wait" }] }
  ];
}

export function createEnemy(id) {
  return {
    id,
    type: "rook",
    icon: "♜",
    x: 0,
    y: 0,
    movementMode: "step",
    blockedByWalls: true,
    canPassObstacles: false,
    notes: "",
    behavior: { state: "idle", rules: defaultEnemyRuleSet() },
    telegraphCountdown: 0,
    telegraphMarker: "⚠️"
  };
}

export function createTrap(id) {
  return {
    id,
    type: "spikes",
    x: 0,
    y: 0,
    icon: "🗡️",
    trigger: { mode: "turnMod", every: 2, offset: 0 },
    effect: { type: "log", message: "Trap triggered" },
    notes: ""
  };
}

export function createDefaultState(rows, cols) {
  const tiles = Array.from({ length: rows }, () => Array.from({ length: cols }, () => "ground"));
  return {
    config: { rows, cols },
    tiles,
    player: { x: Math.floor(cols / 2), y: Math.floor(rows / 2), dice: { ...DEFAULT_DICE }, hp: 10 },
    enemies: [],
    traps: [],
    turn: { number: 0, phase: "idle", log: [] }
  };
}

export function pushLog(state, message) {
  state.turn.log.push(`[T${state.turn.number}][${state.turn.phase}] ${message}`);
  if (state.turn.log.length > 30) state.turn.log = state.turn.log.slice(-30);
}

export function canMoveTo(state, x, y) {
  if (x < 0 || y < 0 || y >= state.config.rows || x >= state.config.cols) return false;
  return state.tiles[y][x] === "ground";
}

export function rollDice(dice, direction) {
  const d = { ...dice };
  if (direction === "left") return { ...d, top: d.right, right: d.bottom, bottom: d.left, left: d.top };
  if (direction === "right") return { ...d, top: d.left, left: d.bottom, bottom: d.right, right: d.top };
  if (direction === "up") return { ...d, top: d.front, front: d.bottom, bottom: d.back, back: d.top };
  if (direction === "down") return { ...d, top: d.back, back: d.bottom, bottom: d.front, front: d.top };
  return d;
}
