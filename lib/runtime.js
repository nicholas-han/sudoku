import { CELL_COUNT, GRID_SIZE } from "../src/constants.js";
import { SudokuGame } from "../src/game.js";
import { computeCandidates } from "../src/backtracker.js";
import { UNITS } from "../src/grader.js";
import { loadBank } from "./bank.js";
import { ProgressStore } from "./store.js";

const DIGITS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);

function rowOf(index) {
  return Math.floor(index / GRID_SIZE) + 1;
}

function colOf(index) {
  return (index % GRID_SIZE) + 1;
}

function validIndex(index) {
  return Number.isInteger(index) && index >= 0 && index < CELL_COUNT;
}

function selectedIndexes(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(validIndex))];
}

function savedGameIsValid(saved, puzzle) {
  const game = saved?.game;
  if (!game || typeof game !== "object") return false;
  if (!Array.isArray(game.values) || game.values.length !== CELL_COUNT) return false;
  if (!Array.isArray(game.edgeNotes) || game.edgeNotes.length !== CELL_COUNT) return false;
  if (!Array.isArray(game.centerNotes) || game.centerNotes.length !== CELL_COUNT) return false;
  if (!Array.isArray(game.history)) return false;

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = game.values[index];
    if (value !== "" && !DIGITS.has(value)) return false;
    const given = puzzle.puzzle[index];
    if (given !== "0" && value !== given) return false;
    if (!Array.isArray(game.edgeNotes[index])) return false;
    if (!Array.isArray(game.centerNotes[index])) return false;
  }

  return true;
}

export function describeMessage(message) {
  if (!message) return "";
  const data = message.data || {};
  const cell = `r${data.row}c${data.col}`;

  switch (message.code) {
    case "loaded":
      return `Loaded ${data.title}.`;
    case "reset-done":
      return "Puzzle reset.";
    case "undo-done":
      return "Undo successful.";
    case "nothing-undo":
      return "Nothing to undo.";
    case "digits-used":
      return `All nine ${data.value}s are already on the board. Erase one to place it elsewhere.`;
    case "center-limit":
      return "Center marks hold up to four digits. Repeat an existing digit to remove it.";
    case "clue-locked":
      return "Clues cannot be changed.";
    case "notes-locked":
      return "Marks can only be edited in empty player cells.";
    case "center-partial":
      return "Some center marks were already full.";
    case "finished-correct":
      return "The board is complete and correct.";
    case "finished-wrong":
      return "The board is complete, but some entries are wrong.";
    case "cells-left":
      return `${data.n} cells left. Finish the grid to check the answer.`;
    case "hint-naked":
      return `Hint: ${cell} = ${data.value} (only candidate).`;
    case "hint-hidden":
      return `Hint: ${cell} = ${data.value} (only place in its unit).`;
    case "hint-advanced":
      return `Hint: ${cell} = ${data.value} (needs advanced logic; value taken from the solver).`;
    case "hint-wrong":
      return `${cell} does not match the solution. Consider erasing it.`;
    case "grid-full":
      return "The grid is full. Check the answer or undo a move.";
    case "solved":
      return "Puzzle solved.";
    default:
      return message.code;
  }
}

export class SudokuRuntime {
  constructor({ root, dataDir } = {}) {
    this.puzzles = loadBank(root || process.cwd());
    this.byId = new Map(this.puzzles.map((puzzle) => [puzzle.id, puzzle]));
    this.store = new ProgressStore(dataDir);
    this.game = null;
    this.puzzle = null;
    this.revision = 0;
    this.check = null;
    this.hint = null;
    this.message = null;

    if (!this.restore()) {
      this.startPuzzle(this.puzzles[0].id, { persist: false });
    }
  }

  startPuzzle(id, { persist = true } = {}) {
    const puzzle = this.byId.get(String(id));

    if (!puzzle) {
      throw new Error(`Unknown puzzle: ${id}`);
    }

    this.puzzle = puzzle;
    this.game = new SudokuGame(puzzle);
    this.check = null;
    this.hint = null;
    this.message = { code: "loaded", data: { title: puzzle.title } };

    if (persist) this.save();
    return puzzle;
  }

  restore() {
    const saved = this.store.read();
    if (!saved || saved.version !== 1) return false;

    const puzzle = this.byId.get(saved.puzzleId);
    if (!puzzle || !savedGameIsValid(saved, puzzle)) return false;

    try {
      this.puzzle = puzzle;
      this.game = SudokuGame.fromJSON(puzzle, saved.game);
      this.game.updateNumberCounts();
      this.refreshCheck();
      return true;
    } catch {
      return false;
    }
  }

  save() {
    if (!this.game || !this.puzzle) return;

    if (this.game.getProgress().complete) {
      this.store.clear();
      return;
    }

    this.store.write({
      version: 1,
      puzzleId: this.puzzle.id,
      savedAt: new Date().toISOString(),
      game: this.game.toJSON(),
    });
  }

  refreshCheck() {
    if (!this.game || this.game.getProgress().empty > 0) {
      this.check = null;
      return;
    }

    this.evaluateCheck();
  }

  evaluateCheck() {
    const wrongIndexes = [];

    for (let index = 0; index < CELL_COUNT; index += 1) {
      const value = this.game.values[index];
      if (value !== "" && value !== this.puzzle.solution[index]) {
        wrongIndexes.push(index);
      }
    }

    this.check = { correct: wrongIndexes.length === 0, wrongIndexes };
  }

  snapshot() {
    const progress = this.game.getProgress();

    return {
      revision: this.revision,
      puzzle: {
        id: this.puzzle.id,
        title: this.puzzle.title,
        type: this.puzzle.type,
        difficulty: this.puzzle.difficulty,
        givens: this.game.givens.filter(Boolean).length,
      },
      puzzles: this.puzzles.map((puzzle) => ({
        id: puzzle.id,
        title: puzzle.title,
        difficulty: puzzle.difficulty,
      })),
      values: [...this.game.values],
      givens: [...this.game.givens],
      edgeNotes: this.game.edgeNotes.map((notes) => [...notes].sort()),
      centerNotes: this.game.centerNotes.map((notes) => [...notes].sort()),
      numberCounts: { ...this.game.numberCounts },
      conflicts: [...this.game.getGivenConflictIndexes()],
      progress: {
        filled: progress.filled,
        empty: progress.empty,
        complete: progress.complete,
      },
      check: this.check
        ? { correct: this.check.correct, wrongIndexes: [...this.check.wrongIndexes] }
        : null,
      hint: this.hint ? { ...this.hint } : null,
      history: this.game.history.length,
    };
  }

  // 面板的每个操作与 sudoku 工具共用这一入口；两条调用路径不复制规则。
  applyAction(input) {
    if (!input || typeof input !== "object") {
      throw new Error("Sudoku action must be an object.");
    }

    const action = typeof input.action === "string" ? input.action : "";
    this.hint = null;

    switch (action) {
      case "new":
        this.startPuzzle(input.puzzleId);
        break;
      case "enter":
        this.enter(input);
        break;
      case "undo":
        this.undo();
        break;
      case "reset":
        this.reset();
        break;
      case "check":
        this.checkBoard();
        break;
      case "hint":
        this.giveHint();
        break;
      case "solve":
        this.solveBoard();
        break;
      default:
        throw new Error(`Unknown sudoku action: ${action || "(missing)"}`);
    }

    this.revision += 1;
    this.refreshCheck();
    this.save();

    return { state: this.snapshot(), message: this.message };
  }

  enter(input) {
    const mode =
      input.mode === "edge" || input.mode === "center" ? input.mode : "value";
    const rawValue = input.value === undefined || input.value === null ? "" : String(input.value);
    const value = rawValue === "0" ? "" : rawValue;

    if (value !== "" && !DIGITS.has(value)) {
      throw new Error(`Cell value must be 1-9 or empty, received: ${rawValue}`);
    }

    const indexes = selectedIndexes(input.indexes);
    let changed = 0;
    let skipped = 0;
    let limited = 0;
    let usedUp = 0;

    for (const index of indexes) {
      try {
        if (value === "") {
          if (this.game.eraseCell(index)) changed += 1;
          else skipped += 1;
        } else if (mode === "edge") {
          const result = this.game.toggleEdgeNote(index, value);
          if (result.changed) changed += 1;
          else skipped += 1;
        } else if (mode === "center") {
          const result = this.game.toggleCenterNote(index, value);
          if (result.changed) changed += 1;
          else if (result.reason === "center-note-limit") limited += 1;
          else skipped += 1;
        } else if (this.game.setCell(index, value)) {
          changed += 1;
        } else if (this.game.givens[index]) {
          skipped += 1;
        } else {
          usedUp += 1;
        }
      } catch {
        skipped += 1;
      }
    }

    const progress = this.game.getProgress();

    if (progress.empty === 0) {
      this.message = {
        code: progress.wrong === 0 ? "finished-correct" : "finished-wrong",
      };
    } else if (changed === 0 && usedUp > 0) {
      this.message = { code: "digits-used", data: { value } };
    } else if (changed === 0 && limited > 0) {
      this.message = { code: "center-limit" };
    } else if (changed === 0 && skipped > 0) {
      this.message = {
        code: value === "" || mode === "value" ? "clue-locked" : "notes-locked",
      };
    } else if (limited > 0) {
      this.message = { code: "center-partial" };
    } else {
      this.message = null;
    }
  }

  undo() {
    this.message = this.game.undo() ? { code: "undo-done" } : { code: "nothing-undo" };
  }

  reset() {
    this.game.reset();
    this.check = null;
    this.message = { code: "reset-done" };
  }

  checkBoard() {
    const progress = this.game.getProgress();

    if (progress.empty > 0) {
      this.check = null;
      this.message = { code: "cells-left", data: { n: progress.empty } };
      return;
    }

    this.evaluateCheck();
    this.message = {
      code: this.check.correct ? "finished-correct" : "finished-wrong",
    };
  }

  giveHint() {
    const progress = this.game.getProgress();

    if (progress.empty === 0) {
      this.message = { code: "grid-full" };
      return;
    }

    const cells = [...this.game.values];
    const wrongIndex = cells.findIndex(
      (value, index) => value !== "" && value !== this.puzzle.solution[index],
    );

    if (wrongIndex >= 0) {
      this.message = {
        code: "hint-wrong",
        data: { row: rowOf(wrongIndex), col: colOf(wrongIndex) },
      };
      return;
    }

    const candidates = computeCandidates(cells);
    let target = -1;
    let reason = "naked";
    let value = null;

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (cells[index] === "" && candidates[index].size === 1) {
        target = index;
        value = [...candidates[index]][0];
        break;
      }
    }

    if (target < 0) {
      for (const unit of UNITS) {
        for (let digit = 1; digit <= 9 && target < 0; digit += 1) {
          const candidate = String(digit);
          const spots = unit.filter(
            (index) =>
              cells[index] === "" && candidates[index].has(candidate),
          );

          if (spots.length === 1 && candidates[spots[0]].size > 1) {
            target = spots[0];
            value = candidate;
            reason = "hidden";
          }
        }
        if (target >= 0) break;
      }
    }

    if (target < 0) {
      target = cells.findIndex((cell) => cell === "");
      value = this.puzzle.solution[target];
      reason = "advanced";
    }

    if (target < 0 || !this.game.setCell(target, value)) {
      this.message = { code: "grid-full" };
      return;
    }

    this.hint = { index: target, value };
    this.message = {
      code: `hint-${reason}`,
      data: { row: rowOf(target), col: colOf(target), value },
    };
  }

  solveBoard() {
    this.game = new SudokuGame(this.puzzle);

    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (!this.game.givens[index]) {
        this.game.setCell(index, this.puzzle.solution[index]);
      }
    }

    this.check = { correct: true, wrongIndexes: [] };
    this.message = { code: "solved" };
  }

  boardLines() {
    const lines = [];

    for (let row = 0; row < GRID_SIZE; row += 1) {
      const cells = this.game.values
        .slice(row * GRID_SIZE, (row + 1) * GRID_SIZE)
        .map((value) => value || ".");

      lines.push(
        `r${row + 1}  ${cells.slice(0, 3).join(" ")} | ${cells
          .slice(3, 6)
          .join(" ")} | ${cells.slice(6, 9).join(" ")}`,
      );
    }

    return lines;
  }

  notesSummary() {
    const notes = [];

    for (let index = 0; index < CELL_COUNT; index += 1) {
      const edge = [...this.game.edgeNotes[index]].sort();
      const center = [...this.game.centerNotes[index]].sort();

      if (edge.length || center.length) {
        const parts = [];
        if (edge.length) parts.push(`corner ${edge.join(",")}`);
        if (center.length) parts.push(`center ${center.join(",")}`);
        notes.push(`r${rowOf(index)}c${colOf(index)}: ${parts.join("; ")}`);
      }
    }

    return notes;
  }

  boardText() {
    const progress = this.game.getProgress();
    const conflicts = [...this.game.getGivenConflictIndexes()];
    const parts = [
      `Puzzle: ${this.puzzle.title} (${this.puzzle.id}, ${this.puzzle.difficulty})`,
      `Progress: ${progress.filled}/81 filled, ${progress.empty} empty; conflicts: ${
        conflicts.length
          ? conflicts.map((index) => `r${rowOf(index)}c${colOf(index)}`).join(", ")
          : "none"
      }`,
      ...this.boardLines(),
    ];

    const notes = this.notesSummary();
    parts.push(notes.length ? `Notes:\n${notes.map((line) => `  ${line}`).join("\n")}` : "Notes: none");

    if (this.hint) {
      parts.push(`Last hint: r${rowOf(this.hint.index)}c${colOf(this.hint.index)} = ${this.hint.value}`);
    }

    if (this.check) {
      parts.push(
        this.check.correct
          ? "Check: solved correctly."
          : `Check: ${this.check.wrongIndexes.length} wrong cell(s) at ${this.check.wrongIndexes
              .map((index) => `r${rowOf(index)}c${colOf(index)}`)
              .join(", ")}.`,
      );
    }

    parts.push(`Undo history: ${this.game.history.length} move(s).`);
    return parts.join("\n");
  }

  state() {
    return {
      puzzle: {
        id: this.puzzle.id,
        title: this.puzzle.title,
        difficulty: this.puzzle.difficulty,
        type: this.puzzle.type,
      },
      board: this.game.values.map((value) => value || "0").join(""),
      progress: { ...this.game.getProgress() },
      conflicts: [...this.game.getGivenConflictIndexes()],
      check: this.check
        ? { correct: this.check.correct, wrongIndexes: [...this.check.wrongIndexes] }
        : null,
      hint: this.hint ? { ...this.hint } : null,
      notes: this.notesSummary(),
      history: this.game.history.length,
      text: this.boardText(),
    };
  }

  dispose() {
    this.save();
  }
}
