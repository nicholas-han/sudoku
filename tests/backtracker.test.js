import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countSolutions, peerIndexes, solve } from "../src/backtracker.js";
import { fallbackPuzzle } from "../src/storage.js";

const PUZZLE = fallbackPuzzle.puzzle;
const SOLUTION = fallbackPuzzle.solution;

function blank(grid, indexes) {
  const chars = grid.split("");
  for (const index of indexes) {
    chars[index] = "0";
  }
  return chars.join("");
}

describe("peerIndexes", () => {
  it("returns 20 peers excluding self", () => {
    const peers = peerIndexes(0);
    assert.equal(peers.size, 20);
    assert.equal(peers.has(0), false);
    assert.equal(peers.has(8), true);
    assert.equal(peers.has(72), true);
    assert.equal(peers.has(20), true);
  });
});

describe("solve", () => {
  it("solves classic-001 to its known solution", () => {
    assert.equal(solve(PUZZLE), SOLUTION);
  });

  it("returns null for a contradictory grid", () => {
    const grid = "55" + "0".repeat(79);
    assert.equal(solve(grid), null);
  });

  it("returns null when a cell has no candidates", () => {
    // r0c0-c7 填 1-8，r1c8 填 9（与 r0c8 同宫）→ r0c8 无候选
    const grid = "123456780" + "000000009" + "0".repeat(63);
    assert.equal(solve(grid), null);
  });

  it("solves the empty grid (performance smoke)", () => {
    const solution = solve("0".repeat(81));
    assert.equal(solution.length, 81);
    assert.equal(countSolutions(solution), 1);
  });

  it("rejects malformed grids", () => {
    assert.throws(() => solve("123"));
    assert.throws(() => solve(null));
  });
});

describe("countSolutions", () => {
  it("classic-001 has a unique solution", () => {
    assert.equal(countSolutions(PUZZLE), 1);
  });

  it("detects multiple solutions (deadly rectangle)", () => {
    // 从完整答案挖掉 r3c5/r3c8/r4c5/r4c8（1-3 对，可互换）→ 恰好两个解
    const ambiguous = blank(SOLUTION, [32, 35, 41, 44]);
    assert.equal(countSolutions(ambiguous), 2);
  });

  it("returns 0 for a contradictory grid", () => {
    assert.equal(countSolutions("55" + "0".repeat(79)), 0);
  });

  it("a full valid grid counts as exactly one", () => {
    assert.equal(countSolutions(SOLUTION), 1);
  });
});
