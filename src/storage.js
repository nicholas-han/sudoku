import { CELL_COUNT, EMPTY_CELL } from "./constants.js";

export const SUPPORTED_FORMAT = "sudoku-v1";
export const SUPPORTED_INDEX_FORMAT = "sudoku-index-v1";

export const fallbackPuzzle = {
  format: SUPPORTED_FORMAT,
  id: "classic-001",
  title: "Starter Puzzle 001",
  type: "classic-9x9",
  difficulty: "easy",
  puzzle:
    "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
  solution:
    "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
  rules: ["classic"],
  tags: ["beginner", "starter"],
};

// 兜底索引：题库索引不可用时仍可玩内置题
export const fallbackIndex = {
  format: SUPPORTED_INDEX_FORMAT,
  updatedAt: null,
  puzzles: [
    {
      id: fallbackPuzzle.id,
      file: `${fallbackPuzzle.id}.json`,
      title: fallbackPuzzle.title,
      difficulty: fallbackPuzzle.difficulty,
      canonical: null,
    },
  ],
};

export function normalizeIndex(rawIndex) {
  if (!rawIndex || typeof rawIndex !== "object") {
    throw new Error("Index must be an object.");
  }

  if (rawIndex.format !== SUPPORTED_INDEX_FORMAT) {
    throw new Error(`Unsupported index format: ${rawIndex.format}`);
  }

  if (!Array.isArray(rawIndex.puzzles)) {
    throw new Error("Index must contain a puzzles array.");
  }

  const puzzles = rawIndex.puzzles.map((entry, position) => {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      typeof entry.file !== "string" ||
      typeof entry.title !== "string"
    ) {
      throw new Error(`Index entry ${position} is missing id, file, or title.`);
    }

    return {
      id: entry.id,
      file: entry.file,
      title: entry.title,
      difficulty: typeof entry.difficulty === "string" ? entry.difficulty : null,
      canonical: typeof entry.canonical === "string" ? entry.canonical : null,
    };
  });

  return {
    format: rawIndex.format,
    updatedAt: typeof rawIndex.updatedAt === "string" ? rawIndex.updatedAt : null,
    puzzles,
  };
}

export function normalizePuzzle(rawPuzzle) {
  if (!rawPuzzle || typeof rawPuzzle !== "object") {
    throw new Error("Puzzle must be an object.");
  }

  const puzzle = {
    format: rawPuzzle.format,
    id: rawPuzzle.id,
    title: rawPuzzle.title,
    type: rawPuzzle.type,
    difficulty: rawPuzzle.difficulty,
    puzzle: rawPuzzle.puzzle,
    solution: rawPuzzle.solution,
    rules: Array.isArray(rawPuzzle.rules) ? rawPuzzle.rules : [],
    tags: Array.isArray(rawPuzzle.tags) ? rawPuzzle.tags : [],
    source:
      rawPuzzle.source && typeof rawPuzzle.source === "object" ? rawPuzzle.source : null,
    createdAt: typeof rawPuzzle.createdAt === "string" ? rawPuzzle.createdAt : null,
  };

  validatePuzzle(puzzle);
  return puzzle;
}

export function validatePuzzle(puzzle) {
  if (puzzle.format !== SUPPORTED_FORMAT) {
    throw new Error(`Unsupported puzzle format: ${puzzle.format}`);
  }

  if (puzzle.type !== "classic-9x9") {
    throw new Error(`Unsupported puzzle type: ${puzzle.type}`);
  }

  assertGridString(puzzle.puzzle, "puzzle", true);
  assertGridString(puzzle.solution, "solution", false);

  for (let index = 0; index < CELL_COUNT; index += 1) {
    const given = puzzle.puzzle[index];

    if (given !== EMPTY_CELL && given !== puzzle.solution[index]) {
      throw new Error(`Puzzle conflicts with solution at cell ${index}.`);
    }
  }

  return true;
}

function assertGridString(value, fieldName, allowEmpty) {
  if (typeof value !== "string" || value.length !== CELL_COUNT) {
    throw new Error(`${fieldName} must be an 81-character string.`);
  }

  const pattern = allowEmpty ? /^[0-9]{81}$/ : /^[1-9]{81}$/;

  if (!pattern.test(value)) {
    throw new Error(`${fieldName} contains invalid characters.`);
  }
}
