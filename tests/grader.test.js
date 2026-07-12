import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DIFFICULTIES } from "../src/constants.js";
import { TECHNIQUES, UNITS, gradePuzzle } from "../src/grader.js";
import { solve } from "../src/backtracker.js";
import { fallbackPuzzle } from "../src/storage.js";

// 公认的困难题（Platinum Blonde，21 提示数），单靠基础技巧解不动
const HARD_PUZZLE =
  "000000012000000003002300400001800005060070800000009000008500000900040500470006000";

describe("registry shape", () => {
  it("every technique has name, valid tier, and apply()", () => {
    assert.ok(TECHNIQUES.length >= 4);
    for (const technique of TECHNIQUES) {
      assert.equal(typeof technique.name, "string");
      assert.ok(DIFFICULTIES.includes(technique.tier), technique.name);
      assert.equal(typeof technique.apply, "function");
    }
  });

  it("UNITS covers 27 units of 9 cells", () => {
    assert.equal(UNITS.length, 27);
    for (const unit of UNITS) {
      assert.equal(unit.length, 9);
    }
  });
});

describe("gradePuzzle", () => {
  it("solves and grades classic-001 as easy", () => {
    const result = gradePuzzle(fallbackPuzzle.puzzle);
    assert.equal(result.solved, true);
    assert.equal(result.difficulty, "easy");
    assert.ok(result.techniquesUsed.length > 0);
  });

  it("grades a hard puzzle as expert (techniques stall)", () => {
    // 前置确认该题确实有解，只是逻辑技巧推不完
    assert.equal(typeof solve(HARD_PUZZLE), "string");
    const result = gradePuzzle(HARD_PUZZLE);
    assert.equal(result.solved, false);
    assert.equal(result.difficulty, "expert");
  });

  it("a completed grid grades easy with no techniques", () => {
    const result = gradePuzzle(fallbackPuzzle.solution);
    assert.equal(result.solved, true);
    assert.equal(result.difficulty, "easy");
    assert.deepEqual(result.techniquesUsed, []);
  });

  it("difficulty is always a known tier", () => {
    for (const grid of [fallbackPuzzle.puzzle, HARD_PUZZLE]) {
      assert.ok(DIFFICULTIES.includes(gradePuzzle(grid).difficulty));
    }
  });
});
