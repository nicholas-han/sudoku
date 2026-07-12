import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyCellEdit,
  buildIndexEntry,
  buildPuzzleJson,
  checkProvidedSolution,
  findDuplicate,
  nextId,
  rebuildIndex,
  renderAsciiGrid,
  sanityCheckGivens,
} from "../tools/lib/import.js";
import { SYMMETRIES, applySymmetry, canonicalKey } from "../src/canonical.js";
import { fallbackPuzzle, normalizePuzzle } from "../src/storage.js";

const GRID = fallbackPuzzle.puzzle;

describe("sanityCheckGivens", () => {
  it("passes a healthy grid", () => {
    const { errors, warnings } = sanityCheckGivens(GRID);
    assert.deepEqual(errors, []);
    assert.deepEqual(warnings, []);
  });

  it("rejects malformed strings", () => {
    assert.ok(sanityCheckGivens("123").errors.length > 0);
    assert.ok(sanityCheckGivens("x".repeat(81)).errors.length > 0);
  });

  it("rejects fewer than 17 givens", () => {
    const grid = "1".padEnd(81, "0");
    assert.match(sanityCheckGivens(grid).errors[0], /at least 17/);
  });

  it("warns when suspiciously full (OCR probably solved it)", () => {
    const { errors, warnings } = sanityCheckGivens(fallbackPuzzle.solution);
    assert.deepEqual(errors, []);
    assert.match(warnings[0], /may have solved/);
  });

  it("reports conflicting givens with coordinates", () => {
    const conflicted = "55" + GRID.slice(2);
    assert.match(sanityCheckGivens(conflicted).errors[0], /r1c1 and r1c2/);
  });
});

describe("nextId", () => {
  it("increments past the highest classic id", () => {
    const index = { puzzles: [{ id: "classic-001" }, { id: "classic-007" }, { id: "other-9" }] };
    assert.equal(nextId(index), "classic-008");
  });

  it("starts at 001 on an empty index", () => {
    assert.equal(nextId({ puzzles: [] }), "classic-001");
  });
});

describe("findDuplicate", () => {
  const index = {
    puzzles: [
      { id: "classic-001", canonical: canonicalKey(GRID) },
      { id: "classic-002", canonical: null },
    ],
  };

  it("hits on a rotated + relabeled variant", () => {
    const rot90 = SYMMETRIES.find((s) => s.name === "rot90");
    const disguised = applySymmetry(GRID, rot90)
      .split("")
      .map((ch) => (ch === "0" ? "0" : String(10 - Number(ch))))
      .join("");
    const hit = findDuplicate(index, canonicalKey(disguised));
    assert.equal(hit.id, "classic-001");
  });

  it("misses on a different puzzle and ignores null canonicals", () => {
    assert.equal(findDuplicate(index, canonicalKey("0" + GRID.slice(1))), null);
  });
});

describe("buildPuzzleJson / buildIndexEntry", () => {
  const puzzle = buildPuzzleJson({
    id: "classic-042",
    title: "Classic 042",
    grid: GRID,
    solution: fallbackPuzzle.solution,
    difficulty: "medium",
    source: { kind: "manual", note: "test" },
    createdAt: "2026-07-11T00:00:00.000Z",
  });

  it("survives a normalizePuzzle round-trip with fields intact", () => {
    const normalized = normalizePuzzle(puzzle);
    assert.equal(normalized.id, "classic-042");
    assert.equal(normalized.difficulty, "medium");
    assert.deepEqual(normalized.source, { kind: "manual", note: "test" });
    assert.equal(normalized.createdAt, "2026-07-11T00:00:00.000Z");
  });

  it("index entry derives file name and canonical", () => {
    const entry = buildIndexEntry(puzzle);
    assert.equal(entry.file, "classic-042.json");
    assert.equal(entry.canonical, canonicalKey(GRID));
    assert.equal(entry.difficulty, "medium");
  });
});

describe("rebuildIndex", () => {
  it("rebuilds sorted entries from puzzle objects", () => {
    const second = buildPuzzleJson({
      id: "classic-002",
      title: "Second",
      grid: GRID,
      solution: fallbackPuzzle.solution,
      difficulty: "easy",
      source: null,
      createdAt: null,
    });
    const index = rebuildIndex([second, fallbackPuzzle], "2026-07-11T00:00:00.000Z");
    assert.equal(index.format, "sudoku-index-v1");
    assert.deepEqual(
      index.puzzles.map((entry) => entry.id),
      ["classic-001", "classic-002"],
    );
    assert.equal(index.puzzles[0].canonical, canonicalKey(fallbackPuzzle.puzzle));
  });

  it("rejects invalid puzzle objects", () => {
    assert.throws(() => rebuildIndex([{ format: "nope" }], null));
  });
});

describe("renderAsciiGrid", () => {
  it("renders 11 lines with box separators and dots for blanks", () => {
    const lines = renderAsciiGrid(GRID).split("\n");
    assert.equal(lines.length, 11);
    assert.equal(lines[0], "5 3 . | . 7 . | . . .");
    assert.equal(lines[3], "------+-------+------");
  });
});

describe("checkProvidedSolution", () => {
  const SOLUTION = fallbackPuzzle.solution;

  it("accepts the correct solution", () => {
    assert.deepEqual(checkProvidedSolution(GRID, SOLUTION, SOLUTION), []);
  });

  it("rejects malformed strings (wrong length, zeros)", () => {
    assert.match(checkProvidedSolution(GRID, SOLUTION.slice(0, 80), SOLUTION)[0], /81 digits/);
    assert.match(
      checkProvidedSolution(GRID, "0" + SOLUTION.slice(1), SOLUTION)[0],
      /81 digits/,
    );
  });

  it("rejects a solution with internal conflicts", () => {
    // 把 r1c1 改成与 r1c2 相同的数字制造冲突
    const conflicted = SOLUTION[1] + SOLUTION.slice(1);
    const errors = checkProvidedSolution(GRID, conflicted, SOLUTION);
    assert.match(errors[0], /conflicts with itself/);
  });

  it("rejects a solution that contradicts the givens, naming the cell", () => {
    // 交换答案中 1 和 2 两种数字 → 内部依然合法，但与给定数矛盾
    const swapped = SOLUTION.split("")
      .map((ch) => (ch === "1" ? "2" : ch === "2" ? "1" : ch))
      .join("");
    const errors = checkProvidedSolution(GRID, swapped, swapped);
    assert.match(errors[0], /contradicts the puzzle givens at: r2c4/);
  });

  it("rejects a solution that disagrees with the solver", () => {
    // 同样的换数字手法，但套在无给定数约束的空盘上 → 只触发求解器不一致
    const swapped = SOLUTION.split("")
      .map((ch) => (ch === "1" ? "2" : ch === "2" ? "1" : ch))
      .join("");
    const errors = checkProvidedSolution("0".repeat(81), swapped, SOLUTION);
    assert.match(errors[0], /disagrees with the solver/);
    assert.match(errors[0], /typo/);
  });
});

describe("applyCellEdit", () => {
  it("sets and clears cells", () => {
    assert.equal(applyCellEdit(GRID, "r1c3=4")[2], "4");
    assert.equal(applyCellEdit(GRID, "r1c1=0")[0], "0");
    assert.equal(applyCellEdit(GRID, " R9C9=5 ")[80], "5");
  });

  it("rejects malformed edits", () => {
    assert.throws(() => applyCellEdit(GRID, "r0c5=7"), /Invalid edit/);
    assert.throws(() => applyCellEdit(GRID, "r3c5=x"), /Invalid edit/);
    assert.throws(() => applyCellEdit(GRID, "3,5,7"), /Invalid edit/);
  });
});
