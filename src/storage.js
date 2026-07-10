import { CELL_COUNT, EMPTY_CELL } from "./constants.js";

export const SUPPORTED_FORMAT = "sudoku-v1";

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

export async function loadPuzzle(url = "./puzzles/classic-001.json") {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Cannot load puzzle: ${response.status}`);
    }

    return normalizePuzzle(await response.json());
  } catch (error) {
    console.warn("Using embedded puzzle fallback.", error);
    return normalizePuzzle(fallbackPuzzle);
  }
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
