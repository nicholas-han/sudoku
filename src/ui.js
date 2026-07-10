import { SudokuGame } from "./game.js";
import { loadPuzzle } from "./storage.js";

const boardElement = document.querySelector("#board");
const numberPadElement = document.querySelector("#number-pad");
const modeElement = document.querySelector("#input-mode");
const titleElement = document.querySelector("#puzzle-title");
const metaElement = document.querySelector("#puzzle-meta");
const statusElement = document.querySelector("#status");
const progressElement = document.querySelector("#progress");
const checkButton = document.querySelector("#check");
const resetButton = document.querySelector("#reset");

let game;
let inputMode = "value";
let selectedIndexes = new Set();
let primaryIndex = null;
let isDraggingSelection = false;
let activePointerId = null;
let multiSelectMode = false;

bootstrap();

async function bootstrap() {
  const puzzle = await loadPuzzle();
  game = new SudokuGame(puzzle);

  titleElement.textContent = puzzle.title;
  metaElement.textContent = `${puzzle.type} · ${puzzle.difficulty} · ${puzzle.id}`;

  renderBoard();
  renderNumberPad();
  updateView("Select a cell, then enter a digit.");
  bindEvents();
}

function renderBoard() {
  boardElement.innerHTML = "";

  for (const cell of game.getCells()) {
    const button = document.createElement("button");
    button.className = "cell";
    button.type = "button";
    button.dataset.index = String(cell.index);
    button.setAttribute("aria-label", `Row ${cell.row + 1}, column ${cell.col + 1}`);
    boardElement.append(button);
  }
}

function renderNumberPad() {
  numberPadElement.innerHTML = "";

  for (let value = 1; value <= 9; value += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = String(value);
    button.dataset.value = String(value);
    button.classList.toggle("used-up", game.numberCounts[String(value)] >= 9);
    numberPadElement.append(button);
  }

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.innerHTML = `
    <span>Erase</span>
    <kbd>←</kbd>
  `;
  clearButton.dataset.value = "";
  clearButton.id = "erase";
  clearButton.className = "wide";
  numberPadElement.append(clearButton);

  const undoButton = document.createElement("button");
  undoButton.type = "button";
  undoButton.innerHTML = `
    <span>Undo</span>
    <kbd>Z</kbd>
  `;
  undoButton.className = "wide";
  undoButton.id = "undo";
  numberPadElement.append(undoButton);
}

function bindEvents() {
  boardElement.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    const button = event.target.closest("[data-index]");

    if (!button) {
      return;
    }

    const isMultiSelect = event.metaKey || event.ctrlKey;
    const index = Number(button.dataset.index);

    isDraggingSelection = true;
    activePointerId = event.pointerId;
    multiSelectMode = isMultiSelect;  // 保存多选模式状态

    // 保存初始点击的索引，用于拖拽时的区域选择
    primaryIndex = index;

    if (isMultiSelect) {
      // Cmd+点击：添加到现有选择
      addSelection(index);
    } else {
      // 普通点击：只选中当前单元格
      selectOnly(index);
    }

    // 防止拖拽时选中文本
    event.preventDefault();
  });

  boardElement.addEventListener("pointermove", (event) => {
    if (!isDraggingSelection || event.pointerId !== activePointerId) {
      return;
    }

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const button = element?.closest?.("[data-index]");

    if (!button || !boardElement.contains(button)) {
      return;
    }

    const index = Number(button.dataset.index);

    if (multiSelectMode) {
      // Cmd+拖拽：添加到现有选择
      addSelection(index);
    } else {
      // 普通拖拽：选择矩形区域
      if (primaryIndex !== null) {
        selectRange(primaryIndex, index);
      }
    }
  });

  document.addEventListener("pointerup", finishSelectionDrag);
  document.addEventListener("pointercancel", finishSelectionDrag);

  numberPadElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-value]");

    if (!button || getSelectedIndexes().length === 0) {
      return;
    }

    // 检查是否是undo按钮
    if (button.id === "undo") {
      undo();
      return;
    }

    enterValue(button.dataset.value);
  });

  modeElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");

    if (!button) {
      return;
    }

    inputMode = button.dataset.mode;
    updateView(modeMessage());
  });

  document.addEventListener("keydown", handleKeyboard);

  checkButton.addEventListener("click", () => {
    const progress = game.getProgress();

    if (progress.empty > 0) {
      updateView(`${progress.empty} cells left. Finish the grid to check your answer.`);
    } else {
      updateView(completionMessage(progress));
    }
  });

  resetButton.addEventListener("click", () => {
    game.reset();
    selectedIndexes = new Set();
    primaryIndex = null;
    updateView("Puzzle reset.");
  });
}

function enterValue(value) {
  const targetIndexes = getSelectedIndexes();
  let changed = 0;
  let skipped = 0;
  let limited = 0;

  for (const index of targetIndexes) {
    try {
      let result;

      if (value === "") {
        result = { changed: game.eraseCell(index) };
      } else if (inputMode === "edge") {
        result = game.toggleEdgeNote(index, value);
      } else if (inputMode === "center") {
        result = game.toggleCenterNote(index, value);
      } else {
        result = { changed: game.setCell(index, value) };
      }

      if (result.changed) {
        changed += 1;
      } else if (result.reason === "center-note-limit") {
        limited += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      skipped += 1;
    }
  }

  const progress = game.getProgress();
  let message = progress.empty === 0 ? completionMessage(progress) : "";

  if (!message && changed === 0 && limited > 0) {
    message = "Center marks can hold up to 4 digits. Repeat an existing digit to remove it.";
  } else if (!message && changed === 0 && skipped > 0) {
    message = value === "" || inputMode === "value"
      ? "Clues cannot be changed."
      : "Marks can only be edited in empty player cells.";
  } else if (!message && limited > 0) {
    message = "Some center marks were already full.";
  }

  updateView(message);
}

function handleKeyboard(event) {
  if (!game) {
    return;
  }

  const shortcutMode = {
    a: "value",
    s: "edge",
    d: "center",
  }[event.key.toLowerCase()];

  if (shortcutMode) {
    inputMode = shortcutMode;
    updateView(modeMessage());
    event.preventDefault();
    return;
  }

  if (getSelectedIndexes().length === 0) {
    return;
  }

  if (/^[1-9]$/.test(event.key)) {
    enterValue(event.key);
    event.preventDefault();
    return;
  }

  if (event.key === "Backspace" || event.key === "Delete" || event.key === "0") {
    enterValue("");
    event.preventDefault();
    return;
  }

  if (event.key === "z" || event.key === "Z") {
    undo();
    event.preventDefault();
    return;
  }

  const movement = {
    ArrowUp: -9,
    ArrowDown: 9,
    ArrowLeft: -1,
    ArrowRight: 1,
  }[event.key];

  if (movement === undefined) {
    return;
  }

  const nextIndex = primaryIndex + movement;

  if (nextIndex >= 0 && nextIndex < 81) {
    selectOnly(nextIndex);
    updateView();
  }

  event.preventDefault();
}

function updateView(message = "") {
  const selected = primaryIndex;
  const peers = selected === null ? new Set() : game.getPeerIndexes(selected);
  const conflicts = game.getGivenConflictIndexes();
  const progress = game.getProgress();
  const selectedCell = selected === null ? null : game.getCell(selected);

  for (const button of modeElement.querySelectorAll("[data-mode]")) {
    button.classList.toggle("active", button.dataset.mode === inputMode);
    button.setAttribute("aria-pressed", String(button.dataset.mode === inputMode));
  }

  for (const button of boardElement.querySelectorAll(".cell")) {
    const index = Number(button.dataset.index);
    const cell = game.getCell(index);

    button.replaceChildren(renderCellContent(cell));
    button.classList.toggle("given", cell.given);
    button.classList.toggle("selected", selectedIndexes.has(index));
    button.classList.toggle("peer", peers.has(index));
    button.classList.toggle(
      "same-value",
      cell.value !== "" && selectedCell?.value !== "" && cell.value === selectedCell?.value,
    );
    button.classList.toggle("conflict", conflicts.has(index));
    button.classList.toggle("noted", cell.value === "" && (cell.edgeNotes.length > 0 || cell.centerNotes.length > 0));

  }

  progressElement.textContent = `${progress.filled}/81`;
  statusElement.textContent = message || modeMessage();

  // 更新数字键盘按钮的样式
  for (let value = 1; value <= 9; value += 1) {
    const button = numberPadElement.querySelector(`button[data-value="${value}"]`);
    if (button) {
      button.classList.toggle("used-up", game.numberCounts[String(value)] >= 9);
    }
  }
}

function renderCellContent(cell) {
  const fragment = document.createDocumentFragment();

  if (cell.value !== "") {
    const value = document.createElement("span");
    value.className = "cell-value";
    value.textContent = cell.value;
    fragment.append(value);
    return fragment;
  }

  if (cell.edgeNotes.length > 0) {
    const edgeNotes = document.createElement("span");
    edgeNotes.className = "edge-notes";

    for (let digit = 1; digit <= 9; digit += 1) {
      const note = document.createElement("span");
      note.textContent = cell.edgeNotes.includes(String(digit)) ? String(digit) : "";
      edgeNotes.append(note);
    }

    fragment.append(edgeNotes);
  }

  if (cell.centerNotes.length > 0) {
    const centerNotes = document.createElement("span");
    centerNotes.className = "center-notes";

    // 将notes按数字大小排序
    const sortedNotes = [...cell.centerNotes].sort((a, b) => parseInt(a) - parseInt(b));
    centerNotes.textContent = sortedNotes.join("");

    fragment.append(centerNotes);
  }

  return fragment;
}

function completionMessage(progress) {
  return progress.wrong === 0 ? "Congratulations!" : "Incorrect answer. Please go back and try again.";
}

function modeMessage() {
  if (inputMode === "edge") {
    return "Corner Marks: A digit can only be placed in cells marked with it within this 3×3 box.";
  }

  if (inputMode === "center") {
    return "Center Marks: This cell can only contain one of the digits marked in its center.";
  }

  return "Answer Mode: Conflicts are shown only when an entry clashes with a given clue.";
}

function selectOnly(index) {
  selectedIndexes = new Set([index]);
  primaryIndex = index;
}

function selectRange(startIndex, endIndex) {
  // 计算两个单元格之间的所有单元格
  const startRow = Math.floor(startIndex / 9);
  const startCol = startIndex % 9;
  const endRow = Math.floor(endIndex / 9);
  const endCol = endIndex % 9;

  // 创建新的选择集合
  const newSelection = new Set();

  // 添加矩形区域内的所有单元格
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      const index = row * 9 + col;
      if (index >= 0 && index < 81) {
        newSelection.add(index);
      }
    }
  }

  selectedIndexes = newSelection;
  primaryIndex = endIndex;
}

function addSelection(index) {
  if (selectedIndexes.has(index)) {
    return;
  }

  selectedIndexes.add(index);
  primaryIndex = index;
}

function finishSelectionDrag(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  isDraggingSelection = false;
  activePointerId = null;
}


function getSelectedIndexes() {
  return Array.from(selectedIndexes);
}

function undo() {
  if (game.undo()) {
    updateView("Undo successful.");
  } else {
    updateView("Nothing to undo.");
  }
}
