import { CELL_COUNT, EMPTY_CELL, GRID_SIZE } from "./constants.js";

// 独立的同行/列/宫索引几何，供求解器与评级器使用，不依赖 SudokuGame 实例
export function peerIndexes(index) {
  const peers = new Set();
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;

  for (let cursor = 0; cursor < GRID_SIZE; cursor += 1) {
    peers.add(row * GRID_SIZE + cursor);
    peers.add(cursor * GRID_SIZE + col);
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      peers.add(r * GRID_SIZE + c);
    }
  }

  peers.delete(index);
  return peers;
}

const PEERS = Array.from({ length: CELL_COUNT }, (_, index) => [...peerIndexes(index)]);

export function gridToCells(gridString) {
  if (typeof gridString !== "string" || gridString.length !== CELL_COUNT) {
    throw new Error("Grid must be an 81-character string.");
  }
  return gridString.split("").map((ch) => (ch === EMPTY_CELL || ch === "." ? "" : ch));
}

// 每个空格的候选数集合；给定数冲突时对应格为空集
export function computeCandidates(cells) {
  return cells.map((value, index) => {
    if (value !== "") {
      return new Set();
    }
    const candidates = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    for (const peer of PEERS[index]) {
      candidates.delete(cells[peer]);
    }
    return candidates;
  });
}

function hasGivenConflict(cells) {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = cells[index];
    if (value === "") continue;
    for (const peer of PEERS[index]) {
      if (cells[peer] === value) {
        return true;
      }
    }
  }
  return false;
}

// 回溯搜索，MRV 启发（总是先填候选数最少的格子）。
// limit 控制最多找几个解；结果收集在 solutions 里。
function search(cells, solutions, limit) {
  let bestIndex = -1;
  let bestCandidates = null;

  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (cells[index] !== "") continue;

    const candidates = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    for (const peer of PEERS[index]) {
      candidates.delete(cells[peer]);
    }

    if (candidates.size === 0) {
      return;
    }

    if (bestCandidates === null || candidates.size < bestCandidates.size) {
      bestIndex = index;
      bestCandidates = candidates;
      if (candidates.size === 1) break;
    }
  }

  if (bestIndex === -1) {
    solutions.push(cells.join(""));
    return;
  }

  for (const value of bestCandidates) {
    cells[bestIndex] = value;
    search(cells, solutions, limit);
    cells[bestIndex] = "";
    if (solutions.length >= limit) {
      return;
    }
  }
}

// 返回解串，无解返回 null
export function solve(gridString) {
  const cells = gridToCells(gridString);
  if (hasGivenConflict(cells)) {
    return null;
  }
  const solutions = [];
  search(cells, solutions, 1);
  return solutions[0] ?? null;
}

// 返回 0、1 或 limit（表示 ≥limit 个解），默认用于唯一解校验
export function countSolutions(gridString, limit = 2) {
  const cells = gridToCells(gridString);
  if (hasGivenConflict(cells)) {
    return 0;
  }
  const solutions = [];
  search(cells, solutions, limit);
  return solutions.length;
}
