import { bindEvents } from "./input.js";
import { renderAll } from "./render.js";
import { createDefaultState } from "./state.js";

const els = {
  board: document.getElementById("board"),
  previewBar: document.getElementById("previewBar"),
  configModal: document.getElementById("configModal"),
  openConfigBtn: document.getElementById("openConfigBtn"),
  closeConfigBtn: document.getElementById("closeConfigBtn"),
  rowsInput: document.getElementById("rowsInput"),
  colsInput: document.getElementById("colsInput"),
  applyBoardBtn: document.getElementById("applyBoardBtn"),
  addEnemyBtn: document.getElementById("addEnemyBtn"),
  addTrapBtn: document.getElementById("addTrapBtn"),
  togglePlaceEnemyBtn: document.getElementById("togglePlaceEnemyBtn"),
  togglePlaceTrapBtn: document.getElementById("togglePlaceTrapBtn"),
  enemyList: document.getElementById("enemyList"),
  trapList: document.getElementById("trapList"),
  exportBtn: document.getElementById("exportBtn"),
  importInput: document.getElementById("importInput"),
  toast: document.getElementById("toast"),
  turnIndicator: document.getElementById("turnIndicator"),
  eventLog: document.getElementById("eventLog"),
  clearLogBtn: document.getElementById("clearLogBtn")
};

const ui = { isConfigOpen: false, placeEnemyMode: false, placeTrapMode: false, selectedEnemyId: null, selectedTrapId: null };
const stateRef = { current: createDefaultState(16, 10) };

bindEvents({ els, ui, stateRef });
renderAll(stateRef.current, ui, els);
