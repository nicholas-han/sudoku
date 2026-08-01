import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SudokuGame } from "../src/game.js";
import { fallbackPuzzle, normalizePuzzle } from "../src/storage.js";

// fallback 谜题速查：
// - index 0 是给定格 "5"，index 2/3/5/6/7/8/10/11 是空格
// - "1" 的给定格有 3 个（index 12、44、67）
const puzzle = normalizePuzzle(fallbackPuzzle);

function newGame() {
  return new SudokuGame(puzzle);
}

describe("initial state / reset", () => {
  it("loads 30 givens", () => {
    const game = newGame();
    assert.equal(game.getProgress().filled, 30);
    assert.equal(game.getProgress().empty, 51);
    assert.equal(game.getCell(0).given, true);
    assert.equal(game.getCell(0).value, "5");
    assert.equal(game.getCell(2).given, false);
    assert.equal(game.getCell(2).value, "");
  });

  it("reset clears player entries, notes, and history", () => {
    const game = newGame();
    game.setCell(2, "4");
    game.setCell(3, "");
    game.toggleEdgeNote(3, "1");
    game.toggleCenterNote(5, "2");
    game.reset();

    assert.equal(game.getCell(2).value, "");
    assert.deepEqual(game.getCell(3).edgeNotes, []);
    assert.deepEqual(game.getCell(5).centerNotes, []);
    assert.equal(game.history.length, 0);
    assert.equal(game.getProgress().filled, 30);
  });
});

describe("setCell", () => {
  it("sets and clears a player cell", () => {
    const game = newGame();
    assert.equal(game.setCell(2, "4"), true);
    assert.equal(game.getCell(2).value, "4");
    assert.equal(game.clearCell(2), true);
    assert.equal(game.getCell(2).value, "");
  });

  it("rejects writes to given cells", () => {
    const game = newGame();
    assert.equal(game.setCell(0, "9"), false);
    assert.equal(game.getCell(0).value, "5");
  });

  it("throws on invalid values and indexes", () => {
    const game = newGame();
    assert.throws(() => game.setCell(2, "x"));
    assert.throws(() => game.setCell(2, "10"));
    assert.throws(() => game.setCell(-1, "1"));
    assert.throws(() => game.setCell(81, "1"));
  });

  it("re-setting the same value is a no-op and adds no history", () => {
    const game = newGame();
    game.setCell(2, "4");
    const historyLength = game.history.length;
    assert.equal(game.setCell(2, "4"), true);
    assert.equal(game.history.length, historyLength);
  });

  it("marks wrong entries against the solution", () => {
    const game = newGame();
    game.setCell(2, "5");
    assert.equal(game.getCell(2).wrong, true);
    game.setCell(2, "4"); // solution[2] === "4"
    assert.equal(game.getCell(2).wrong, false);
    assert.equal(game.getProgress().wrong, 0);
  });
});

describe("digit count limit (9 of each)", () => {
  it("blocks a 10th copy of a digit and unlocks after erase", () => {
    const game = newGame();
    // 3 个给定 "1" + 6 个玩家 "1" = 9 个
    for (const index of [2, 3, 5, 6, 7, 8]) {
      assert.equal(game.setCell(index, "1"), true);
    }
    assert.equal(game.numberCounts["1"], 9);

    // 第 10 个被拒绝，棋盘不变
    assert.equal(game.setCell(10, "1"), false);
    assert.equal(game.getCell(10).value, "");
    assert.equal(game.numberCounts["1"], 9);

    // 擦掉一个后自动解锁
    assert.equal(game.eraseCell(5), true);
    assert.equal(game.numberCounts["1"], 8);
    assert.equal(game.setCell(10, "1"), true);
    assert.equal(game.numberCounts["1"], 9);
  });

  it("allows overwriting a cell with a different digit at the limit", () => {
    const game = newGame();
    for (const index of [2, 3, 5, 6, 7, 8]) {
      game.setCell(index, "1");
    }
    // 覆盖一个已有的 "1" 不受它自己计数影响
    assert.equal(game.setCell(2, "9"), true);
    assert.equal(game.numberCounts["1"], 8);
  });

  it("tracks counts through set and erase", () => {
    const game = newGame();
    const before = game.numberCounts["4"];
    game.setCell(2, "4");
    assert.equal(game.numberCounts["4"], before + 1);
    game.eraseCell(2);
    assert.equal(game.numberCounts["4"], before);
  });
});

describe("eraseCell", () => {
  it("clears value and notes", () => {
    const game = newGame();
    game.toggleEdgeNote(2, "1");
    game.toggleCenterNote(2, "2");
    assert.equal(game.eraseCell(2), true);
    assert.deepEqual(game.getCell(2).edgeNotes, []);
    assert.deepEqual(game.getCell(2).centerNotes, []);
  });

  it("rejects given cells", () => {
    const game = newGame();
    assert.equal(game.eraseCell(0), false);
    assert.equal(game.getCell(0).value, "5");
  });

  it("erasing an already-empty cell adds no history", () => {
    const game = newGame();
    assert.equal(game.eraseCell(2), true);
    assert.equal(game.history.length, 0);
  });
});

describe("notes", () => {
  it("toggles edge notes on and off", () => {
    const game = newGame();
    assert.deepEqual(game.toggleEdgeNote(2, "1"), { changed: true, added: true });
    game.toggleEdgeNote(2, "5");
    assert.deepEqual(game.getCell(2).edgeNotes, ["1", "5"]);
    assert.deepEqual(game.toggleEdgeNote(2, "1"), { changed: true, added: false });
    assert.deepEqual(game.getCell(2).edgeNotes, ["5"]);
  });

  it("center notes cap at 4 and toggle off on repeat", () => {
    const game = newGame();
    for (const value of ["1", "2", "3", "4"]) {
      assert.deepEqual(game.toggleCenterNote(2, value), { changed: true, added: true });
    }
    assert.deepEqual(game.toggleCenterNote(2, "5"), {
      changed: false,
      reason: "center-note-limit",
    });
    game.toggleCenterNote(2, "3");
    assert.deepEqual(game.getCell(2).centerNotes, ["1", "2", "4"]);
  });

  it("rejects notes on givens, filled cells, and invalid values", () => {
    const game = newGame();
    assert.throws(() => game.toggleEdgeNote(0, "1")); // given
    game.setCell(2, "4");
    assert.throws(() => game.toggleEdgeNote(2, "1")); // filled
    assert.throws(() => game.toggleCenterNote(3, "0")); // invalid value
  });

  it("setCell clears the cell's own notes", () => {
    const game = newGame();
    game.toggleEdgeNote(2, "1");
    game.toggleCenterNote(2, "2");
    game.setCell(2, "4");
    assert.deepEqual(game.getCell(2).edgeNotes, []);
    assert.deepEqual(game.getCell(2).centerNotes, []);
  });
});

describe("clearConflictingNotes", () => {
  it("removes the placed digit from peer notes only", () => {
    const game = newGame();
    game.toggleEdgeNote(10, "4"); // 同宫
    game.toggleCenterNote(11, "4"); // 同宫+同列
    game.toggleEdgeNote(10, "9"); // 其他数字保留
    game.toggleEdgeNote(40, "4"); // 非 peer 保留

    game.setCell(2, "4");

    assert.deepEqual(game.getCell(10).edgeNotes, ["9"]);
    assert.deepEqual(game.getCell(11).centerNotes, []);
    assert.deepEqual(game.getCell(40).edgeNotes, ["4"]);
  });
});

describe("getPeerIndexes", () => {
  it("returns 20 peers covering row, column, and box, excluding self", () => {
    const game = newGame();
    const peers = game.getPeerIndexes(0);
    assert.equal(peers.size, 20);
    assert.equal(peers.has(0), false);
    assert.equal(peers.has(8), true); // 同行
    assert.equal(peers.has(72), true); // 同列
    assert.equal(peers.has(20), true); // 同宫
    assert.equal(peers.has(40), false); // 无关格
  });

  it("center cell also has exactly 20 peers", () => {
    const game = newGame();
    assert.equal(game.getPeerIndexes(40).size, 20);
  });
});

describe("getGivenConflictIndexes", () => {
  it("flags both the entry and the clashing given", () => {
    const game = newGame();
    game.setCell(2, "5"); // 与 index 0 的给定 "5" 同行同宫
    const conflicts = game.getGivenConflictIndexes();
    assert.equal(conflicts.has(0), true);
    assert.equal(conflicts.has(2), true);
  });

  it("clears when the entry changes", () => {
    const game = newGame();
    game.setCell(2, "5");
    game.setCell(2, "4");
    assert.equal(game.getGivenConflictIndexes().size, 0);
  });
});

describe("getProgress", () => {
  it("completes when the full solution is entered", () => {
    const game = newGame();
    for (let index = 0; index < 81; index += 1) {
      if (!game.getCell(index).given) {
        assert.equal(game.setCell(index, puzzle.solution[index]), true);
      }
    }
    const progress = game.getProgress();
    assert.equal(progress.filled, 81);
    assert.equal(progress.wrong, 0);
    assert.equal(progress.complete, true);
  });

  it("a full grid with mistakes is not complete", () => {
    const game = newGame();
    for (let index = 0; index < 81; index += 1) {
      if (!game.getCell(index).given) {
        game.setCell(index, puzzle.solution[index]);
      }
    }
    // 交换两个格子的值制造错误（直接改会被满9次规则挡住）
    game.eraseCell(2); // solution "4"
    game.eraseCell(7); // solution "1"
    assert.equal(game.setCell(2, "1"), true);
    assert.equal(game.setCell(7, "4"), true);
    const progress = game.getProgress();
    assert.equal(progress.filled, 81);
    assert.equal(progress.wrong, 2);
    assert.equal(progress.complete, false);
  });
});

describe("undo", () => {
  it("returns false with empty history", () => {
    const game = newGame();
    assert.equal(game.undo(), false);
  });

  it("restores a cell value and its counts", () => {
    const game = newGame();
    game.setCell(2, "4");
    game.setCell(2, "9");
    assert.equal(game.undo(), true);
    assert.equal(game.getCell(2).value, "4");
    game.undo();
    assert.equal(game.getCell(2).value, "");
    assert.equal(game.numberCounts["4"], newGame().numberCounts["4"]);
  });

  it("restores an erased cell's value and notes", () => {
    const game = newGame();
    game.toggleEdgeNote(2, "1");
    game.toggleCenterNote(2, "2");
    game.eraseCell(2);
    assert.equal(game.undo(), true);
    assert.deepEqual(game.getCell(2).edgeNotes, ["1"]);
    assert.deepEqual(game.getCell(2).centerNotes, ["2"]);
  });

  it("undoes note toggles", () => {
    const game = newGame();
    game.toggleEdgeNote(2, "1");
    game.toggleEdgeNote(2, "5");
    game.undo();
    assert.deepEqual(game.getCell(2).edgeNotes, ["1"]);
    game.toggleCenterNote(3, "7");
    game.undo();
    assert.deepEqual(game.getCell(3).centerNotes, []);
  });

  it("restores peer notes wiped by clearConflictingNotes", () => {
    const game = newGame();
    game.toggleEdgeNote(10, "4");
    game.toggleCenterNote(11, "4");
    game.setCell(2, "4"); // 连带清掉 10/11 的 "4" 笔记

    assert.equal(game.undo(), true);
    assert.equal(game.getCell(2).value, "");
    assert.deepEqual(game.getCell(10).edgeNotes, ["4"]);
    assert.deepEqual(game.getCell(11).centerNotes, ["4"]);
  });

  it("unwinds multiple steps in order", () => {
    const game = newGame();
    game.setCell(2, "4");
    game.setCell(3, "6");
    game.toggleEdgeNote(5, "8");
    game.undo();
    game.undo();
    game.undo();
    assert.equal(game.getCell(2).value, "");
    assert.equal(game.getCell(3).value, "");
    assert.deepEqual(game.getCell(5).edgeNotes, []);
    assert.equal(game.undo(), false);
  });
});

describe("serialization", () => {
  it("toJSON produces valid shape", () => {
    const game = newGame();
    game.setCell(2, "4");
    game.toggleEdgeNote(5, "1");
    game.toggleCenterNote(7, "3");

    const json = game.toJSON();
    assert.equal(json.values.length, 81);
    assert.equal(json.edgeNotes.length, 81);
    assert.equal(json.centerNotes.length, 81);
    assert.ok(Array.isArray(json.edgeNotes[5]));
    assert.ok(Array.isArray(json.centerNotes[7]));
    assert.equal(typeof json.numberCounts["4"], "number");
    assert.ok(Array.isArray(json.history));
    assert.ok(json.history.length >= 3);
  });

  it("fromJSON restores values, notes, and counts", () => {
    const game = newGame();
    game.setCell(2, "4");
    game.setCell(3, "6");
    game.toggleEdgeNote(5, "1");
    game.toggleEdgeNote(5, "9");
    game.toggleCenterNote(7, "2");
    game.toggleCenterNote(7, "3");

    const json = game.toJSON();
    const restored = SudokuGame.fromJSON(game.puzzle, json);

    assert.equal(restored.getCell(2).value, "4");
    assert.equal(restored.getCell(3).value, "6");
    assert.deepEqual(restored.getCell(5).edgeNotes, ["1", "9"]);
    assert.deepEqual(restored.getCell(7).centerNotes, ["2", "3"]);
    assert.equal(restored.numberCounts["4"], game.numberCounts["4"]);
    assert.equal(restored.numberCounts["6"], game.numberCounts["6"]);
    assert.equal(restored.history.length, game.history.length);
  });

  it("round-trip preserves full game state", () => {
    const game = newGame();
    game.setCell(2, "4");
    game.setCell(3, "6");
    game.toggleEdgeNote(5, "1");
    game.toggleCenterNote(7, "2");
    game.setCell(10, "9");
    // 导致 clearConflictingNotes 清除 peer 笔记
    game.toggleEdgeNote(11, "9");
    game.setCell(10, "");

    const json = game.toJSON();
    const restored = SudokuGame.fromJSON(game.puzzle, json);

    // 逐格对比 values 与 notes
    for (let index = 0; index < 81; index += 1) {
      assert.equal(
        restored.getCell(index).value,
        game.getCell(index).value,
        `value at ${index}`,
      );
      assert.deepEqual(
        restored.getCell(index).edgeNotes,
        game.getCell(index).edgeNotes,
        `edgeNotes at ${index}`,
      );
      assert.deepEqual(
        restored.getCell(index).centerNotes,
        game.getCell(index).centerNotes,
        `centerNotes at ${index}`,
      );
    }

    assert.deepEqual(restored.numberCounts, game.numberCounts);
    assert.equal(restored.history.length, game.history.length);
  });

  it("restored game has working undo", () => {
    const game = newGame();
    game.setCell(2, "4");
    game.toggleEdgeNote(5, "1");

    const restored = SudokuGame.fromJSON(game.puzzle, game.toJSON());

    assert.equal(restored.undo(), true); // 撤销 edge note
    assert.deepEqual(restored.getCell(5).edgeNotes, []);

    assert.equal(restored.undo(), true); // 撤销 cell set
    assert.equal(restored.getCell(2).value, "");

    assert.equal(restored.undo(), false);
  });

  it("restored edge-note undo restores old notes correctly", () => {
    const game = newGame();
    game.toggleEdgeNote(2, "1");
    game.toggleEdgeNote(2, "5"); // now notes are [1, 5]
    game.toggleEdgeNote(2, "1"); // remove 1, leaving [5]

    const restored = SudokuGame.fromJSON(game.puzzle, game.toJSON());
    assert.deepEqual(restored.getCell(2).edgeNotes, ["5"]);

    restored.undo(); // should bring back 1
    assert.deepEqual(restored.getCell(2).edgeNotes, ["1", "5"]);
  });

  it("restored center-note undo works", () => {
    const game = newGame();
    game.toggleCenterNote(3, "3");
    game.toggleCenterNote(3, "7");

    const restored = SudokuGame.fromJSON(game.puzzle, game.toJSON());
    assert.deepEqual(restored.getCell(3).centerNotes, ["3", "7"]);

    restored.undo();
    assert.deepEqual(restored.getCell(3).centerNotes, ["3"]);
  });

  it("restored game preserves peer notes for undo", () => {
    const game = newGame();
    game.toggleEdgeNote(10, "4");
    game.toggleCenterNote(11, "4");
    game.setCell(2, "4"); // clearConflictingNotes 清掉 10/11 的 "4"

    const restored = SudokuGame.fromJSON(game.puzzle, game.toJSON());
    assert.equal(restored.getCell(2).value, "4");
    assert.deepEqual(restored.getCell(10).edgeNotes, []);
    assert.deepEqual(restored.getCell(11).centerNotes, []);

    restored.undo();
    assert.equal(restored.getCell(2).value, "");
    assert.deepEqual(restored.getCell(10).edgeNotes, ["4"]);
    assert.deepEqual(restored.getCell(11).centerNotes, ["4"]);
  });

  it("restored game correctly identifies givens", () => {
    const game = newGame();
    game.setCell(2, "9");

    const restored = SudokuGame.fromJSON(game.puzzle, game.toJSON());
    assert.equal(restored.getCell(0).given, true);
    assert.equal(restored.getCell(2).given, false);
    // given cells are still immutable
    assert.equal(restored.setCell(0, "9"), false);
    assert.equal(restored.getCell(0).value, game.getCell(0).value);
  });

  it("fromJSON with an empty game (no history)", () => {
    const game = newGame();
    const restored = SudokuGame.fromJSON(game.puzzle, game.toJSON());

    assert.equal(restored.history.length, 0);
    assert.equal(restored.getProgress().filled, 30);
    assert.equal(restored.undo(), false);
  });
});
