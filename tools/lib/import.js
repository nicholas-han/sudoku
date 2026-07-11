import { CELL_COUNT, EMPTY_CELL, GRID_SIZE } from "../../src/constants.js";
import { canonicalKey } from "../../src/canonical.js";
import { peerIndexes } from "../../src/solver.js";
import { SUPPORTED_FORMAT, SUPPORTED_INDEX_FORMAT, normalizePuzzle } from "../../src/storage.js";

// 17 是经证明的经典数独最少提示数
const MIN_GIVENS = 17;
// 提示数异常多，很可能是 OCR 顺手把题解完了（完整盘面必然唯一解，唯一解校验抓不住）
const SUSPICIOUS_GIVENS = 40;

export function sanityCheckGivens(gridString) {
  const errors = [];
  const warnings = [];

  if (typeof gridString !== "string" || !/^[0-9]{81}$/.test(gridString)) {
    return { errors: ["Grid must be exactly 81 digits (0-9)."], warnings };
  }

  const givens = gridString.split("").filter((ch) => ch !== EMPTY_CELL).length;

  if (givens < MIN_GIVENS) {
    errors.push(
      `Only ${givens} givens - a proper sudoku needs at least ${MIN_GIVENS}. Probably an OCR miss.`,
    );
  }

  if (givens > SUSPICIOUS_GIVENS) {
    warnings.push(
      `${givens} givens is suspiciously many - the OCR model may have solved the puzzle ` +
        "instead of transcribing it. Compare against the photo carefully.",
    );
  }

  const conflicts = [];
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = gridString[index];
    if (value === EMPTY_CELL) continue;
    for (const peer of peerIndexes(index)) {
      if (peer > index && gridString[peer] === value) {
        conflicts.push(`r${Math.floor(index / 9) + 1}c${(index % 9) + 1} and r${Math.floor(peer / 9) + 1}c${(peer % 9) + 1} both have ${value}`);
      }
    }
  }
  if (conflicts.length > 0) {
    errors.push(`Conflicting givens: ${conflicts.join("; ")}.`);
  }

  return { errors, warnings };
}

export function nextId(index) {
  let max = 0;
  for (const entry of index.puzzles) {
    const match = /^classic-(\d+)$/.exec(entry.id);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }
  return `classic-${String(max + 1).padStart(3, "0")}`;
}

export function findDuplicate(index, canonical) {
  return index.puzzles.find((entry) => entry.canonical === canonical) ?? null;
}

export function buildPuzzleJson({ id, title, grid, solution, difficulty, source, createdAt }) {
  return {
    format: SUPPORTED_FORMAT,
    id,
    title,
    type: "classic-9x9",
    difficulty,
    puzzle: grid,
    solution,
    rules: ["classic"],
    tags: [],
    source,
    createdAt,
  };
}

export function buildIndexEntry(puzzleJson) {
  return {
    id: puzzleJson.id,
    file: `${puzzleJson.id}.json`,
    title: puzzleJson.title,
    difficulty: puzzleJson.difficulty,
    canonical: canonicalKey(puzzleJson.puzzle),
  };
}

// 从谜题对象数组重建索引；每个对象先过 normalizePuzzle 往返校验
export function rebuildIndex(puzzleObjects, updatedAt) {
  const puzzles = puzzleObjects
    .map((raw) => normalizePuzzle(raw))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((puzzle) => buildIndexEntry(puzzle));

  return {
    format: SUPPORTED_INDEX_FORMAT,
    updatedAt,
    puzzles,
  };
}

export function renderAsciiGrid(gridString) {
  const lines = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    if (row > 0 && row % 3 === 0) {
      lines.push("------+-------+------");
    }
    const cells = [];
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (col > 0 && col % 3 === 0) {
        cells.push("|");
      }
      const ch = gridString[row * GRID_SIZE + col];
      cells.push(ch === EMPTY_CELL ? "." : ch);
    }
    lines.push(cells.join(" "));
  }
  return lines.join("\n");
}

// 形如 r3c5=7 的单格修正；r/c 为 1-9，值 0 表示清空
export function applyCellEdit(gridString, edit) {
  const match = /^r([1-9])c([1-9])=([0-9])$/i.exec(edit.trim());
  if (!match) {
    throw new Error(`Invalid edit "${edit}" - use rXcY=N (e.g. r3c5=7, 0 clears).`);
  }
  const index = (Number(match[1]) - 1) * GRID_SIZE + (Number(match[2]) - 1);
  const chars = gridString.split("");
  chars[index] = match[3];
  return chars.join("");
}
