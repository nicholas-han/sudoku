import { CELL_COUNT, DIFFICULTIES, GRID_SIZE } from "./constants.js";
import { computeCandidates, gridToCells, peerIndexes } from "./backtracker.js";

// 模块化难度评级器。
//
// 评级模型：用注册表里的解题技巧反复推进，直到解出或卡住；
// 难度 = 解题过程中"必需的最难技巧"所在档位，卡住（需要试错回溯）= expert。
// 每次有进展就从注册表头部重来，保证只在便宜技巧全部失效时才动用贵的。
//
// 扩展方式：向 TECHNIQUES 追加 { name, tier, apply(state) }。
// state = { cells: string[81], candidates: Set<string>[81] }；
// apply 返回是否取得进展（落子或删候选），落子请用 placeValue 保持候选一致。
//
// 注意：当前技巧集下 "hard" 档评不出来（没有注册 hard 级技巧），
// 输出只会是 easy/medium/expert；补充 X-Wing、claiming 等后自然启用。

// 27 个单元：9 行、9 列、9 宫，各为 9 个索引的数组
export const UNITS = (() => {
  const units = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    units.push(Array.from({ length: GRID_SIZE }, (_, col) => row * GRID_SIZE + col));
  }
  for (let col = 0; col < GRID_SIZE; col += 1) {
    units.push(Array.from({ length: GRID_SIZE }, (_, row) => row * GRID_SIZE + col));
  }
  for (let box = 0; box < GRID_SIZE; box += 1) {
    const boxRow = Math.floor(box / 3) * 3;
    const boxCol = (box % 3) * 3;
    const unit = [];
    for (let r = boxRow; r < boxRow + 3; r += 1) {
      for (let c = boxCol; c < boxCol + 3; c += 1) {
        unit.push(r * GRID_SIZE + c);
      }
    }
    units.push(unit);
  }
  return units;
})();

const BOX_UNITS = UNITS.slice(18);

export function placeValue(state, index, value) {
  state.cells[index] = value;
  state.candidates[index] = new Set();
  for (const peer of peerIndexes(index)) {
    state.candidates[peer].delete(value);
  }
}

function nakedSingle(state) {
  let progress = false;
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (state.cells[index] === "" && state.candidates[index].size === 1) {
      placeValue(state, index, [...state.candidates[index]][0]);
      progress = true;
    }
  }
  return progress;
}

function hiddenSingle(state) {
  let progress = false;
  for (const unit of UNITS) {
    for (let digit = 1; digit <= 9; digit += 1) {
      const value = String(digit);
      const spots = unit.filter(
        (index) => state.cells[index] === "" && state.candidates[index].has(value),
      );
      if (spots.length === 1 && state.candidates[spots[0]].size > 1) {
        placeValue(state, spots[0], value);
        progress = true;
      }
    }
  }
  return progress;
}

function nakedPair(state) {
  let progress = false;
  for (const unit of UNITS) {
    const pairCells = unit.filter(
      (index) => state.cells[index] === "" && state.candidates[index].size === 2,
    );
    for (let i = 0; i < pairCells.length; i += 1) {
      for (let j = i + 1; j < pairCells.length; j += 1) {
        const a = [...state.candidates[pairCells[i]]].sort().join("");
        const b = [...state.candidates[pairCells[j]]].sort().join("");
        if (a !== b) continue;
        for (const index of unit) {
          if (index === pairCells[i] || index === pairCells[j]) continue;
          if (state.cells[index] !== "") continue;
          for (const value of a) {
            if (state.candidates[index].delete(value)) {
              progress = true;
            }
          }
        }
      }
    }
  }
  return progress;
}

function pointingPair(state) {
  let progress = false;
  for (const box of BOX_UNITS) {
    for (let digit = 1; digit <= 9; digit += 1) {
      const value = String(digit);
      const spots = box.filter(
        (index) => state.cells[index] === "" && state.candidates[index].has(value),
      );
      if (spots.length < 2 || spots.length > 3) continue;

      const rows = new Set(spots.map((index) => Math.floor(index / GRID_SIZE)));
      const cols = new Set(spots.map((index) => index % GRID_SIZE));

      let line = null;
      if (rows.size === 1) {
        const row = [...rows][0];
        line = Array.from({ length: GRID_SIZE }, (_, col) => row * GRID_SIZE + col);
      } else if (cols.size === 1) {
        const col = [...cols][0];
        line = Array.from({ length: GRID_SIZE }, (_, row) => row * GRID_SIZE + col);
      }
      if (!line) continue;

      for (const index of line) {
        if (box.includes(index) || state.cells[index] !== "") continue;
        if (state.candidates[index].delete(value)) {
          progress = true;
        }
      }
    }
  }
  return progress;
}

export const TECHNIQUES = [
  { name: "naked-single", tier: "easy", apply: nakedSingle },
  { name: "hidden-single", tier: "easy", apply: hiddenSingle },
  { name: "naked-pair", tier: "medium", apply: nakedPair },
  { name: "pointing-pair", tier: "medium", apply: pointingPair },
];

function highestTier(tiers) {
  let highest = "easy";
  for (const tier of tiers) {
    if (DIFFICULTIES.indexOf(tier) > DIFFICULTIES.indexOf(highest)) {
      highest = tier;
    }
  }
  return highest;
}

export function gradePuzzle(gridString) {
  const cells = gridToCells(gridString);
  const state = { cells, candidates: computeCandidates(cells) };
  const techniquesUsed = new Set();

  let progress = true;
  while (progress) {
    progress = false;
    for (const technique of TECHNIQUES) {
      if (technique.apply(state)) {
        techniquesUsed.add(technique.name);
        progress = true;
        break; // 有进展就从最便宜的技巧重来
      }
    }
  }

  const solved = state.cells.every((value) => value !== "");
  const tiers = [...techniquesUsed].map(
    (name) => TECHNIQUES.find((t) => t.name === name).tier,
  );

  return {
    difficulty: solved ? highestTier(tiers) : "expert",
    solved,
    techniquesUsed: [...techniquesUsed],
  };
}
