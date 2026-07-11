import { CELL_COUNT, EMPTY_CELL, GRID_SIZE } from "./constants.js";

// 同构查重的标准化形式：对 8 种几何对称（旋转/镜像）分别做
// 数字按首次出现顺序重标号，取字典序最小的 81 位串作为 canonical key。
//
// 局限：不覆盖 band/stack（行带/列带）置换及带内行列置换。完整的数独
// 同构群约 3×10^6 种变换，photo 场景下书刊重印通常只做旋转/镜像/换数字，
// 本实现足够；如需完整判定，可在此扩展变换集合。

function transformIndex(index, transform) {
  const row = Math.floor(index / GRID_SIZE);
  const col = index % GRID_SIZE;
  const [r, c] = transform(row, col);
  return r * GRID_SIZE + c;
}

// 每个变换给出：新盘面第 (row,col) 格取自原盘面的哪个 (row,col)
export const SYMMETRIES = [
  { name: "identity", map: (r, c) => [r, c] },
  { name: "rot90", map: (r, c) => [8 - c, r] },
  { name: "rot180", map: (r, c) => [8 - r, 8 - c] },
  { name: "rot270", map: (r, c) => [c, 8 - r] },
  { name: "flip-h", map: (r, c) => [r, 8 - c] },
  { name: "flip-v", map: (r, c) => [8 - r, c] },
  { name: "transpose", map: (r, c) => [c, r] },
  { name: "anti-transpose", map: (r, c) => [8 - c, 8 - r] },
];

export function applySymmetry(gridString, symmetry) {
  const chars = new Array(CELL_COUNT);
  for (let index = 0; index < CELL_COUNT; index += 1) {
    chars[index] = gridString[transformIndex(index, symmetry.map)];
  }
  return chars.join("");
}

// 数字按首次出现顺序重标号为 1、2、3…，空格保持 0
export function relabelDigits(gridString) {
  const mapping = new Map();
  let next = 1;
  const chars = new Array(CELL_COUNT);

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const ch = gridString[index];
    if (ch === EMPTY_CELL) {
      chars[index] = EMPTY_CELL;
      continue;
    }
    if (!mapping.has(ch)) {
      mapping.set(ch, String(next));
      next += 1;
    }
    chars[index] = mapping.get(ch);
  }

  return chars.join("");
}

export function canonicalKey(gridString) {
  if (typeof gridString !== "string" || gridString.length !== CELL_COUNT) {
    throw new Error("Grid must be an 81-character string.");
  }

  let smallest = null;
  for (const symmetry of SYMMETRIES) {
    const candidate = relabelDigits(applySymmetry(gridString, symmetry));
    if (smallest === null || candidate < smallest) {
      smallest = candidate;
    }
  }
  return smallest;
}
