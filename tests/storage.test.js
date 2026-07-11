import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SUPPORTED_FORMAT,
  fallbackPuzzle,
  normalizePuzzle,
  validatePuzzle,
} from "../src/storage.js";

describe("normalizePuzzle", () => {
  it("accepts the fallback puzzle and keeps its fields", () => {
    const puzzle = normalizePuzzle(fallbackPuzzle);
    assert.equal(puzzle.format, SUPPORTED_FORMAT);
    assert.equal(puzzle.id, "classic-001");
    assert.equal(puzzle.type, "classic-9x9");
    assert.equal(puzzle.puzzle.length, 81);
    assert.equal(puzzle.solution.length, 81);
  });

  it("defaults rules and tags to empty arrays", () => {
    const puzzle = normalizePuzzle({ ...fallbackPuzzle, rules: undefined, tags: "nope" });
    assert.deepEqual(puzzle.rules, []);
    assert.deepEqual(puzzle.tags, []);
  });

  it("rejects non-objects", () => {
    assert.throws(() => normalizePuzzle(null));
    assert.throws(() => normalizePuzzle("puzzle"));
  });

  it("rejects unsupported format", () => {
    assert.throws(
      () => normalizePuzzle({ ...fallbackPuzzle, format: "sudoku-v2" }),
      /Unsupported puzzle format/,
    );
  });

  it("rejects unsupported type", () => {
    assert.throws(
      () => normalizePuzzle({ ...fallbackPuzzle, type: "killer-9x9" }),
      /Unsupported puzzle type/,
    );
  });

  it("rejects grids that are not 81 characters", () => {
    assert.throws(
      () => normalizePuzzle({ ...fallbackPuzzle, puzzle: fallbackPuzzle.puzzle.slice(0, 80) }),
      /81-character/,
    );
    assert.throws(
      () => normalizePuzzle({ ...fallbackPuzzle, solution: fallbackPuzzle.solution + "1" }),
      /81-character/,
    );
  });

  it("rejects invalid characters", () => {
    assert.throws(
      () => normalizePuzzle({ ...fallbackPuzzle, puzzle: "a" + fallbackPuzzle.puzzle.slice(1) }),
      /invalid characters/,
    );
    // solution 不允许 0
    assert.throws(
      () => normalizePuzzle({ ...fallbackPuzzle, solution: "0" + fallbackPuzzle.solution.slice(1) }),
      /invalid characters/,
    );
  });

  it("rejects givens that contradict the solution", () => {
    // solution[0] 是 "5"，把 puzzle[0] 改成 "6" 制造矛盾
    assert.throws(
      () => normalizePuzzle({ ...fallbackPuzzle, puzzle: "6" + fallbackPuzzle.puzzle.slice(1) }),
      /conflicts with solution/,
    );
  });
});

describe("validatePuzzle", () => {
  it("returns true for a valid puzzle", () => {
    assert.equal(validatePuzzle(normalizePuzzle(fallbackPuzzle)), true);
  });
});
