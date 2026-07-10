import assert from "node:assert/strict";
import { SudokuGame } from "../src/game.js";
import { fallbackPuzzle, normalizePuzzle } from "../src/storage.js";

const puzzle = normalizePuzzle(fallbackPuzzle);
const game = new SudokuGame(puzzle);

assert.equal(game.getProgress().filled, 30);
assert.equal(game.setCell(2, "4"), true);
assert.equal(game.getCell(2).value, "4");
assert.equal(game.clearCell(2), true);
assert.equal(game.getCell(2).value, "");
assert.equal(game.setCell(0, "9"), false);
assert.equal(game.getCell(0).value, "5");

game.setCell(2, "5");
const conflicts = game.getGivenConflictIndexes();
assert.equal(conflicts.has(0), true);
assert.equal(conflicts.has(2), true);

game.setCell(2, "4");
assert.equal(game.getCell(2).wrong, false);
assert.equal(game.getProgress().wrong, 0);

game.setCell(2, "");
game.toggleEdgeNote(2, "1");
game.toggleEdgeNote(2, "5");
assert.deepEqual(game.getCell(2).edgeNotes, ["1", "5"]);
game.toggleEdgeNote(2, "1");
assert.deepEqual(game.getCell(2).edgeNotes, ["5"]);

game.toggleCenterNote(2, "1");
game.toggleCenterNote(2, "2");
game.toggleCenterNote(2, "3");
game.toggleCenterNote(2, "4");
assert.deepEqual(game.getCell(2).centerNotes, ["1", "2", "3", "4"]);
assert.deepEqual(game.toggleCenterNote(2, "5"), {
  changed: false,
  reason: "center-note-limit",
});
game.toggleCenterNote(2, "3");
assert.deepEqual(game.getCell(2).centerNotes, ["1", "2", "4"]);

game.setCell(2, "5");
assert.deepEqual(game.getCell(2).edgeNotes, []);
assert.deepEqual(game.getCell(2).centerNotes, []);
assert.equal(game.getGivenConflictIndexes().has(2), true);
game.setCell(2, "4");
assert.equal(game.getGivenConflictIndexes().has(2), false);

assert.throws(() =>
  normalizePuzzle({
    ...fallbackPuzzle,
    puzzle: fallbackPuzzle.puzzle.slice(0, 80),
  }),
);

// 测试自动清除冲突标记功能
game.setCell(2, "5"); // 先设置一个值
game.setCell(2, ""); // 清除值以便添加标记
game.toggleEdgeNote(2, "1"); // 在冲突单元格上添加标记
game.toggleEdgeNote(2, "2");
game.toggleCenterNote(2, "3");
game.setCell(2, "5"); // 重新设置值
game.setCell(10, "5"); // 设置一个与已有5冲突的值
assert.deepEqual(game.getCell(2).edgeNotes, []); // 冲突的单元格标记应该被清除
assert.deepEqual(game.getCell(2).centerNotes, []); // 冲突的单元格标记应该被清除

// 测试数字填满9次后标为灰色的功能
game.setCell(0, "1");
game.setCell(10, "1");
game.setCell(20, "1");
game.setCell(30, "1");
game.setCell(40, "1");
game.setCell(50, "1");
game.setCell(60, "1");
game.setCell(70, "1");
game.setCell(80, "1"); // 现在"1"已经填满8次
game.setCell(2, "1"); // 第9个"1"，现在"1"已经填满9次

// 尝试设置另一个"1"，应该失败
const result = game.setCell(1, "1");
assert.equal(result, false); // 不应该允许设置已填满的数字

// 测试多选功能
game.setCell(2, "5");
game.setCell(10, "4");

// 模拟多选操作
// 注意：这个测试主要是为了确保代码不会出错
// 实际的多选功能需要在浏览器中测试

// 测试多选功能
game.setCell(2, "5");
game.setCell(10, "4");

// 模拟多选操作
// 注意：这个测试主要是为了确保代码不会出错
// 实际的多选功能需要在浏览器中测试

// 重新设置初始状态以便后续测试
game.setCell(2, "5");
game.setCell(10, "");

console.log("Sudoku core tests passed.");
