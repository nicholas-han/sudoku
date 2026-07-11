import { GRID_SIZE } from "./constants.js";

// 返回 start 与 end 两格构成的矩形区域内的所有单元格索引
export function rangeIndexes(startIndex, endIndex) {
  const startRow = Math.floor(startIndex / GRID_SIZE);
  const startCol = startIndex % GRID_SIZE;
  const endRow = Math.floor(endIndex / GRID_SIZE);
  const endCol = endIndex % GRID_SIZE;

  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);

  const indexes = new Set();

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      indexes.add(row * GRID_SIZE + col);
    }
  }

  return indexes;
}
