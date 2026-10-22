import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  fallbackIndex,
  fallbackPuzzle,
  normalizeIndex,
  normalizePuzzle,
} from "../src/storage.js";

// 题库目录是插件的随包数据：index.json 提供排序与元信息，每个文件仍是
// 完整的 sudoku-v1 记录，因此 tools/add-puzzle.js 可以继续维护它。
export function loadBank(root) {
  const directory = join(root, "puzzles");
  let index = fallbackIndex;

  try {
    index = normalizeIndex(
      JSON.parse(readFileSync(join(directory, "index.json"), "utf8")),
    );
  } catch (error) {
    console.warn(`[sudoku] using the embedded puzzle: ${error.message}`);
  }

  const puzzles = [];
  const seen = new Set();

  for (const entry of index.puzzles) {
    try {
      const puzzle = normalizePuzzle(
        JSON.parse(readFileSync(join(directory, entry.file), "utf8")),
      );

      if (!seen.has(puzzle.id)) {
        seen.add(puzzle.id);
        puzzles.push(puzzle);
      }
    } catch (error) {
      console.warn(`[sudoku] skipping ${entry.file}: ${error.message}`);
    }
  }

  if (puzzles.length === 0) {
    puzzles.push(normalizePuzzle(fallbackPuzzle));
  }

  return puzzles;
}
