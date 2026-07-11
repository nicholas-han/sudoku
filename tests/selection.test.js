import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rangeIndexes } from "../src/selection.js";

describe("rangeIndexes", () => {
  it("single cell", () => {
    assert.deepEqual([...rangeIndexes(40, 40)], [40]);
  });

  it("horizontal span in one row", () => {
    assert.deepEqual([...rangeIndexes(3, 5)].sort((a, b) => a - b), [3, 4, 5]);
  });

  it("vertical span in one column", () => {
    assert.deepEqual([...rangeIndexes(2, 20)].sort((a, b) => a - b), [2, 11, 20]);
  });

  it("rectangle across rows and columns", () => {
    assert.deepEqual(
      [...rangeIndexes(0, 10)].sort((a, b) => a - b),
      [0, 1, 9, 10],
    );
  });

  it("reversed drag (end above/left of start) gives the same rectangle", () => {
    assert.deepEqual(
      [...rangeIndexes(10, 0)].sort((a, b) => a - b),
      [0, 1, 9, 10],
    );
  });

  it("full board corner to corner", () => {
    assert.equal(rangeIndexes(0, 80).size, 81);
  });
});
