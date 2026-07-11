import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SUPPORTED_FORMAT,
  SUPPORTED_INDEX_FORMAT,
  fallbackIndex,
  fallbackPuzzle,
  normalizeIndex,
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

describe("provenance fields", () => {
  it("passes source and createdAt through", () => {
    const source = { kind: "photo", provider: "ollama", image: "IMG_1.jpg" };
    const puzzle = normalizePuzzle({
      ...fallbackPuzzle,
      source,
      createdAt: "2026-07-11T00:00:00.000Z",
    });
    assert.deepEqual(puzzle.source, source);
    assert.equal(puzzle.createdAt, "2026-07-11T00:00:00.000Z");
  });

  it("defaults source and createdAt to null", () => {
    const puzzle = normalizePuzzle(fallbackPuzzle);
    assert.equal(puzzle.source, null);
    assert.equal(puzzle.createdAt, null);
  });

  it("ignores malformed source and createdAt", () => {
    const puzzle = normalizePuzzle({ ...fallbackPuzzle, source: "book", createdAt: 42 });
    assert.equal(puzzle.source, null);
    assert.equal(puzzle.createdAt, null);
  });
});

describe("normalizeIndex", () => {
  const validIndex = {
    format: SUPPORTED_INDEX_FORMAT,
    updatedAt: "2026-07-11T00:00:00.000Z",
    puzzles: [
      {
        id: "classic-001",
        file: "classic-001.json",
        title: "Starter Puzzle 001",
        difficulty: "easy",
        canonical: "0".repeat(81),
      },
    ],
  };

  it("accepts a valid index", () => {
    const index = normalizeIndex(validIndex);
    assert.equal(index.puzzles.length, 1);
    assert.equal(index.puzzles[0].id, "classic-001");
    assert.equal(index.puzzles[0].difficulty, "easy");
  });

  it("defaults missing optional entry fields to null", () => {
    const index = normalizeIndex({
      format: SUPPORTED_INDEX_FORMAT,
      puzzles: [{ id: "a", file: "a.json", title: "A" }],
    });
    assert.equal(index.puzzles[0].difficulty, null);
    assert.equal(index.puzzles[0].canonical, null);
    assert.equal(index.updatedAt, null);
  });

  it("rejects wrong format and malformed entries", () => {
    assert.throws(() => normalizeIndex(null));
    assert.throws(() => normalizeIndex({ format: "nope", puzzles: [] }), /Unsupported index format/);
    assert.throws(() => normalizeIndex({ format: SUPPORTED_INDEX_FORMAT, puzzles: "x" }));
    assert.throws(
      () => normalizeIndex({ format: SUPPORTED_INDEX_FORMAT, puzzles: [{ id: "a" }] }),
      /missing id, file, or title/,
    );
  });

  it("fallback index is itself valid and points at the fallback puzzle", () => {
    const index = normalizeIndex(fallbackIndex);
    assert.equal(index.puzzles[0].id, fallbackPuzzle.id);
  });
});
