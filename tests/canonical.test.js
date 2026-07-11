import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SYMMETRIES,
  applySymmetry,
  canonicalKey,
  relabelDigits,
} from "../src/canonical.js";
import { fallbackPuzzle } from "../src/storage.js";

const PUZZLE = fallbackPuzzle.puzzle;

// 固定的数字置换（1↔9、2↔8……），模拟"换个马甲"的重印题
function permuteDigits(gridString) {
  const mapping = { 1: "9", 2: "8", 3: "7", 4: "6", 5: "5", 6: "4", 7: "3", 8: "2", 9: "1" };
  return gridString
    .split("")
    .map((ch) => (ch === "0" ? "0" : mapping[ch]))
    .join("");
}

describe("applySymmetry", () => {
  it("identity returns the same grid", () => {
    assert.equal(applySymmetry(PUZZLE, SYMMETRIES[0]), PUZZLE);
  });

  it("every symmetry is a permutation of the cells", () => {
    for (const symmetry of SYMMETRIES) {
      const transformed = applySymmetry(PUZZLE, symmetry);
      assert.equal(transformed.length, 81);
      assert.equal(
        transformed.split("").sort().join(""),
        PUZZLE.split("").sort().join(""),
        symmetry.name,
      );
    }
  });

  it("rot90 applied four times returns the original", () => {
    const rot90 = SYMMETRIES.find((s) => s.name === "rot90");
    let grid = PUZZLE;
    for (let i = 0; i < 4; i += 1) {
      grid = applySymmetry(grid, rot90);
    }
    assert.equal(grid, PUZZLE);
  });
});

describe("relabelDigits", () => {
  it("relabels by first occurrence and keeps zeros", () => {
    assert.equal(relabelDigits("970" + "0".repeat(78)), "120" + "0".repeat(78));
  });
});

describe("canonicalKey", () => {
  it("is a valid 81-char key", () => {
    const key = canonicalKey(PUZZLE);
    assert.match(key, /^[0-9]{81}$/);
  });

  it("is invariant under every geometric symmetry", () => {
    const key = canonicalKey(PUZZLE);
    for (const symmetry of SYMMETRIES) {
      assert.equal(canonicalKey(applySymmetry(PUZZLE, symmetry)), key, symmetry.name);
    }
  });

  it("is invariant under digit relabeling", () => {
    assert.equal(canonicalKey(permuteDigits(PUZZLE)), canonicalKey(PUZZLE));
  });

  it("is invariant under combined rotation + relabeling", () => {
    const rot90 = SYMMETRIES.find((s) => s.name === "rot90");
    const disguised = permuteDigits(applySymmetry(PUZZLE, rot90));
    assert.equal(canonicalKey(disguised), canonicalKey(PUZZLE));
  });

  it("distinguishes genuinely different puzzles", () => {
    // 挖掉一个给定数就是不同的题
    const different = "0" + PUZZLE.slice(1);
    assert.notEqual(canonicalKey(different), canonicalKey(PUZZLE));
  });

  it("rejects malformed input", () => {
    assert.throws(() => canonicalKey("123"));
  });
});
