import { SudokuGame } from "./game.js";
import { loadPuzzle } from "./storage.js";
import { rangeIndexes } from "./selection.js";

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
let selectedIndexes = new Set([0]);
let primaryIndex = 0;
let isDraggingSelection = false;
let activePointerId = null;
let dragStartIndex = null;

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
  // Cmd/Ctrl+点击：切换单元格的选中状态；普通单选在 pointerdown 中处理
  boardElement.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");

    if (!button || !(event.metaKey || event.ctrlKey)) {
      return;
    }

    const index = Number(button.dataset.index);

    if (selectedIndexes.has(index)) {
      selectedIndexes.delete(index);
    } else {
      selectedIndexes.add(index);
    }
    primaryIndex = index;

    updateView();
  });

  // 拖拽框选
  boardElement.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey) {
      return;
    }

    const button = event.target.closest("[data-index]");

    if (!button) {
      return;
    }

    const index = Number(button.dataset.index);

    isDraggingSelection = true;
    activePointerId = event.pointerId;
    dragStartIndex = index;
    boardElement.setPointerCapture(event.pointerId);

    selectOnly(index);
    updateView();
  });

  boardElement.addEventListener("pointermove", (event) => {
    if (!isDraggingSelection || event.pointerId !== activePointerId) {
      return;
    }

    // pointer capture 后 event.target 不再更新，需按坐标找当前格
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const button = element?.closest("[data-index]");

    if (!button) {
      return;
    }

    const index = Number(button.dataset.index);

    if (index !== primaryIndex) {
      selectRange(dragStartIndex, index);
      updateView();
    }
  });

  boardElement.addEventListener("pointerup", finishSelectionDrag);
  boardElement.addEventListener("pointercancel", finishSelectionDrag);

  // 键盘导航
  document.addEventListener("keydown", handleKeyboard);

  numberPadElement.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) {
      return;
    }

    if (button.id === "undo") {
      undo();
      return;
    }

    if (button.dataset.value === undefined || getSelectedIndexes().length === 0) {
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

  checkButton.addEventListener("click", () => {
    const progress = game.getProgress();

    if (progress.empty > 0) {
      updateView(`${progress.empty} cells left. Finish the grid to check your answer.`);
    } else {
      updateView(completionMessage(progress));
    }
  });

  resetButton.addEventListener("click", () => {
    if (confirm("确定要重置当前谜题吗？这将清除所有已填入的数字。")) {
      game.reset();
      selectedIndexes = new Set([0]);
      primaryIndex = 0;
      updateView("Puzzle reset.");
    }
  });
}

function enterValue(value) {
  const targetIndexes = getSelectedIndexes();
  let changed = 0;
  let skipped = 0;
  let limited = 0;
  let usedUp = 0;

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

        if (!result.changed && !game.givens[index]) {
          usedUp += 1;
          continue;
        }
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

  if (!message && changed === 0 && usedUp > 0) {
    message = `All nine ${value}s are already on the board. Erase one to place it elsewhere.`;
  } else if (!message && changed === 0 && limited > 0) {
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

  // 不劫持系统快捷键（Cmd+A、Ctrl+S、Cmd+1 等）
  if (event.metaKey || event.ctrlKey || event.altKey) {
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

  if (event.key === "z" || event.key === "Z") {
    undo();
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

  const row = Math.floor(primaryIndex / 9);
  const col = primaryIndex % 9;

  const nextByKey = {
    ArrowUp: row > 0 ? primaryIndex - 9 : null,
    ArrowDown: row < 8 ? primaryIndex + 9 : null,
    ArrowLeft: col > 0 ? primaryIndex - 1 : null,
    ArrowRight: col < 8 ? primaryIndex + 1 : null,
  };

  if (!(event.key in nextByKey)) {
    return;
  }

  const nextIndex = nextByKey[event.key];

  if (nextIndex !== null) {
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
  selectedIndexes = rangeIndexes(startIndex, endIndex);
  primaryIndex = endIndex;
}

function finishSelectionDrag(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }

  isDraggingSelection = false;
  activePointerId = null;
  dragStartIndex = null;
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
