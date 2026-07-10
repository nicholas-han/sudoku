import { CELL_COUNT, EMPTY_CELL, GRID_SIZE } from "./constants.js";

export class SudokuGame {
  constructor(puzzle) {
    this.puzzle = puzzle;
    this.reset();
    this.numberCounts = {}; // 跟踪每个数字的出现次数
    this.updateNumberCounts();
    this.history = []; // 保存操作历史
  }

  reset() {
    this.values = this.puzzle.puzzle.split("").map((value) =>
      value === EMPTY_CELL ? "" : value,
    );
    this.givens = this.puzzle.puzzle
      .split("")
      .map((value) => value !== EMPTY_CELL);
    this.edgeNotes = Array.from({ length: CELL_COUNT }, () => new Set());
    this.centerNotes = Array.from({ length: CELL_COUNT }, () => []);
    this.numberCounts = {};
    this.updateNumberCounts();
    this.history = [];
  }

  setCell(index, value) {
    this.assertIndex(index);

    if (this.givens[index]) {
      return false;
    }

    if (value !== "" && !/^[1-9]$/.test(value)) {
      throw new Error(`Invalid cell value: ${value}`);
    }

    // 检查数字是否已经填满9次
    if (value !== "" && this.numberCounts[value] >= 9) {
      return false;
    }

    // 保存当前状态到历史
    const currentState = {
      index,
      oldValue: this.values[index],
      newValue: value,
      oldEdgeNotes: this.edgeNotes[index] ? new Set(this.edgeNotes[index]) : null,
      oldCenterNotes: this.centerNotes[index] ? [...this.centerNotes[index]] : null,
    };

    this.values[index] = value;

    if (value !== "") {
      this.clearNotes(index);
      this.clearConflictingNotes(index); // 清除冲突标记
      this.updateNumberCounts(); // 更新数字计数
    } else {
      this.updateNumberCounts(); // 清除值时也更新计数
    }

    // 添加到历史
    this.history.push(currentState);

    return true;
  }

  clearCell(index) {
    return this.setCell(index, "");
  }

  eraseCell(index) {
    this.assertIndex(index);

    if (this.givens[index]) {
      return false;
    }

    // 保存状态到历史
    const currentState = {
      index,
      oldValue: this.values[index],
      oldEdgeNotes: this.edgeNotes[index] ? new Set(this.edgeNotes[index]) : null,
      oldCenterNotes: this.centerNotes[index] ? [...this.centerNotes[index]] : null,
    };

    this.values[index] = "";
    this.clearNotes(index);

    // 添加到历史
    this.history.push(currentState);

    return true;
  }

  toggleEdgeNote(index, value) {
    this.assertEditableNote(index, value);

    const notes = this.edgeNotes[index];

    if (notes.has(value)) {
      // 保存状态到历史
      const currentState = {
        index,
        type: 'edge',
        value,
        oldNotes: new Set(notes),
      };

      notes.delete(value);

      // 添加到历史
      this.history.push(currentState);

      return { changed: true, added: false };
    }

    // 保存状态到历史
    const currentState = {
      index,
      type: 'edge',
      value,
      oldNotes: new Set(notes),
    };

    notes.add(value);

    // 添加到历史
    this.history.push(currentState);

    return { changed: true, added: true };
  }

  toggleCenterNote(index, value) {
    this.assertEditableNote(index, value);

    const notes = this.centerNotes[index];
    const existingIndex = notes.indexOf(value);

    if (existingIndex >= 0) {
      // 保存状态到历史
      const currentState = {
        index,
        type: 'center',
        value,
        oldNotes: [...notes],
      };

      notes.splice(existingIndex, 1);

      // 添加到历史
      this.history.push(currentState);

      return { changed: true, added: false };
    }

    if (notes.length >= 4) {
      return { changed: false, reason: "center-note-limit" };
    }

    // 保存状态到历史
    const currentState = {
      index,
      type: 'center',
      value,
      oldNotes: [...notes],
    };

    notes.push(value);

    // 添加到历史
    this.history.push(currentState);

    return { changed: true, added: true };
  }

  clearNotes(index) {
    this.assertIndex(index);
    this.edgeNotes[index].clear();
    this.centerNotes[index] = [];
  }

  updateNumberCounts() {
    // 初始化数字计数
    for (let i = 1; i <= 9; i++) {
      this.numberCounts[String(i)] = 0;
    }

    // 统计每个数字的出现次数
    for (const value of this.values) {
      if (value && value !== EMPTY_CELL) {
        this.numberCounts[value] = (this.numberCounts[value] || 0) + 1;
      }
    }
  }

  getConflictIndexes(index) {
    const conflicts = new Set();
    const value = this.values[index];

    if (!value) return conflicts;

    const peers = this.getPeerIndexes(index);

    for (const peerIndex of peers) {
      if (this.values[peerIndex] === value) {
        conflicts.add(peerIndex);
      }
    }

    return conflicts;
  }

  clearConflictingNotes(index) {
    this.assertIndex(index);

    const value = this.values[index];
    if (!value) return; // 只有在设置了有效值时才需要清除冲突标记

    // 获取所有受影响的单元格（同行、同列、同宫）
    const affectedIndexes = this.getPeerIndexes(index);

    // 清除所有受影响单元格的该数字的标记
    for (const affectedIndex of affectedIndexes) {
      // 从edge notes中移除该数字
      this.edgeNotes[affectedIndex].delete(value);

      // 从center notes中移除该数字
      const centerNotes = this.centerNotes[affectedIndex];
      const noteIndex = centerNotes.indexOf(value);
      if (noteIndex >= 0) {
        centerNotes.splice(noteIndex, 1);
      }
    }
  }

  getCell(index) {
    this.assertIndex(index);

    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;

    return {
      index,
      row,
      col,
      box: Math.floor(row / 3) * 3 + Math.floor(col / 3),
      value: this.values[index],
      solution: this.puzzle.solution[index],
      given: this.givens[index],
      edgeNotes: Array.from(this.edgeNotes[index]).sort(),
      centerNotes: [...this.centerNotes[index]],
      wrong:
        this.values[index] !== "" &&
        this.values[index] !== this.puzzle.solution[index],
    };
  }

  getCells() {
    return Array.from({ length: CELL_COUNT }, (_, index) => this.getCell(index));
  }

  getPeerIndexes(index) {
    const cell = this.getCell(index);
    const peers = new Set();

    for (let cursor = 0; cursor < GRID_SIZE; cursor += 1) {
      peers.add(cell.row * GRID_SIZE + cursor);
      peers.add(cursor * GRID_SIZE + cell.col);
    }

    const boxRow = Math.floor(cell.row / 3) * 3;
    const boxCol = Math.floor(cell.col / 3) * 3;

    for (let row = boxRow; row < boxRow + 3; row += 1) {
      for (let col = boxCol; col < boxCol + 3; col += 1) {
        peers.add(row * GRID_SIZE + col);
      }
    }

    peers.delete(index);
    return peers;
  }

  getGivenConflictIndexes() {
    const conflicts = new Set();

    for (let index = 0; index < CELL_COUNT; index += 1) {
      const value = this.values[index];

      if (this.givens[index] || value === "") {
        continue;
      }

      for (const peerIndex of this.getPeerIndexes(index)) {
        if (this.givens[peerIndex] && this.values[peerIndex] === value) {
          conflicts.add(index);
          conflicts.add(peerIndex);
        }
      }
    }

    return conflicts;
  }

  getProgress() {
    const filled = this.values.filter(Boolean).length;
    const wrong = this.values.filter(
      (value, index) => value !== "" && value !== this.puzzle.solution[index],
    ).length;

    return {
      filled,
      empty: CELL_COUNT - filled,
      wrong,
      complete: filled === CELL_COUNT && wrong === 0,
    };
  }

  assertIndex(index) {
    if (!Number.isInteger(index) || index < 0 || index >= CELL_COUNT) {
      throw new Error(`Cell index out of range: ${index}`);
    }
  }

  assertEditableNote(index, value) {
    this.assertIndex(index);

    if (this.givens[index] || this.values[index] !== "") {
      throw new Error("Notes can only be edited on empty non-given cells.");
    }

    if (!/^[1-9]$/.test(value)) {
      throw new Error(`Invalid note value: ${value}`);
    }
  }

  undo() {
    if (this.history.length === 0) {
      return false;
    }

    const lastAction = this.history.pop();

    if (lastAction.type === 'edge' || lastAction.type === 'center') {
      // 恢复note操作
      if (lastAction.type === 'edge') {
        this.edgeNotes[lastAction.index] = lastAction.oldNotes;
      } else {
        this.centerNotes[lastAction.index] = lastAction.oldNotes;
      }
    } else {
      // 恢复cell值操作
      this.values[lastAction.index] = lastAction.oldValue;

      // 恢复notes
      if (lastAction.oldEdgeNotes) {
        this.edgeNotes[lastAction.index] = lastAction.oldEdgeNotes;
      }
      if (lastAction.oldCenterNotes) {
        this.centerNotes[lastAction.index] = lastAction.oldCenterNotes;
      }

      // 更新数字计数
      this.updateNumberCounts();
    }

    return true;
  }
}
