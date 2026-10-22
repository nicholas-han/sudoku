import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, describe, it } from "node:test";

import { SudokuRuntime, describeMessage } from "../lib/runtime.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const directories = [];

function runtime() {
  const dataDir = mkdtempSync(join(tmpdir(), "sudoku-runtime-"));
  directories.push(dataDir);
  return new SudokuRuntime({ root, dataDir });
}

after(() => {
  for (const directory of directories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("SudokuRuntime", () => {
  it("loads the puzzle bank and starts with the first puzzle", () => {
    const game = runtime();

    assert.deepEqual(
      game.puzzles.map((puzzle) => puzzle.id),
      ["classic-001", "classic-002"],
    );
    assert.equal(game.puzzle.id, "classic-001");

    const state = game.snapshot();
    assert.equal(state.values.length, 81);
    assert.equal(state.givens.filter(Boolean).length, 30);
    assert.equal(state.progress.filled, 30);
    assert.equal(state.progress.empty, 51);
  });

  it("places player digits, locks clues, and undoes one move", () => {
    const game = runtime();

    const placed = game.applyAction({
      action: "enter",
      mode: "value",
      indexes: [2],
      value: "4",
    });
    assert.equal(placed.state.values[2], "4");
    assert.equal(game.game.history.length, 1);

    const locked = game.applyAction({
      action: "enter",
      mode: "value",
      indexes: [0],
      value: "1",
    });
    assert.equal(locked.state.values[0], "5");
    assert.equal(locked.message.code, "clue-locked");

    game.applyAction({
      action: "enter",
      mode: "edge",
      indexes: [3],
      value: "1",
    });
    assert.deepEqual(game.snapshot().edgeNotes[3], ["1"]);

    game.applyAction({ action: "undo" });
    assert.deepEqual(game.snapshot().edgeNotes[3], []);

    game.applyAction({ action: "undo" });
    assert.equal(game.snapshot().values[2], "");

    game.applyAction({ action: "undo" });
    assert.equal(game.applyAction({ action: "undo" }).message.code, "nothing-undo");
  });

  it("gives a logic hint that places a value from the solution", () => {
    const game = runtime();
    const result = game.applyAction({ action: "hint" });

    assert.match(result.message.code, /^hint-/);
    const { row, col, value } = result.message.data;
    const index = (row - 1) * 9 + (col - 1);

    assert.equal(result.state.values[index], value);
    assert.equal(value, game.puzzle.solution[index]);
    assert.deepEqual(result.state.hint, { index, value });
  });

  it("checks only a full grid and reports wrong cells", () => {
    const game = runtime();

    const early = game.applyAction({ action: "check" });
    assert.equal(early.message.code, "cells-left");
    assert.equal(early.message.data.n, 51);

    game.applyAction({ action: "solve" });
    const solved = game.applyAction({ action: "check" });
    assert.equal(solved.message.code, "finished-correct");
    assert.equal(solved.state.check.correct, true);

    // 交换两个玩家格的值，得到一个填满但错误的盘面。
    game.applyAction({
      action: "enter",
      mode: "value",
      indexes: [2, 3],
      value: "",
    });
    game.applyAction({ action: "enter", mode: "value", indexes: [2], value: "6" });
    game.applyAction({ action: "enter", mode: "value", indexes: [3], value: "4" });

    const wrong = game.applyAction({ action: "check" });
    assert.equal(wrong.message.code, "finished-wrong");
    assert.equal(wrong.state.check.correct, false);
    assert.deepEqual(wrong.state.check.wrongIndexes.sort(), [2, 3]);
  });

  it("switches puzzles and persists progress across instances", () => {
    const dataDir = mkdtempSync(join(tmpdir(), "sudoku-runtime-"));
    directories.push(dataDir);

    const first = new SudokuRuntime({ root, dataDir });
    first.applyAction({
      action: "enter",
      mode: "value",
      indexes: [2],
      value: "4",
    });
    first.applyAction({ action: "new", puzzleId: "classic-002" });
    first.dispose();

    const second = new SudokuRuntime({ root, dataDir });
    assert.equal(second.puzzle.id, "classic-002");
    assert.equal(second.snapshot().values.length, 81);
    assert.equal(second.applyAction({ action: "solve" }).message.code, "solved");
    assert.equal(second.store.read(), null);
  });

  it("describes messages for the agent-facing tool text", () => {
    assert.equal(describeMessage(null), "");
    assert.equal(describeMessage({ code: "solved" }), "Puzzle solved.");
    assert.match(
      describeMessage({ code: "hint-naked", data: { row: 1, col: 3, value: "4" } }),
      /r1c3 = 4/,
    );
  });
});
