import { Worker } from "node:worker_threads";

import { describeMessage } from "./runtime.js";

const SOLVER_TIMEOUT_MS = 8000;

const ACTIONS = [
  "state",
  "list",
  "new",
  "set",
  "erase",
  "note",
  "undo",
  "reset",
  "check",
  "hint",
  "solve",
];

const TOOL_PARAMETERS = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ACTIONS,
      description:
        "state = read the live board; list = list puzzles; new = load a puzzle; set = place a digit; erase = clear a cell; note = toggle a corner/center mark; undo/reset/check/hint/solve operate on the live game.",
    },
    puzzleId: {
      type: "string",
      description: "Puzzle id from the list action, for new.",
    },
    row: {
      type: "integer",
      minimum: 1,
      maximum: 9,
      description: "Row 1-9, for set/erase/note.",
    },
    col: {
      type: "integer",
      minimum: 1,
      maximum: 9,
      description: "Column 1-9, for set/erase/note.",
    },
    value: {
      type: "string",
      enum: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
      description: "Digit 1-9, for set/note.",
    },
    noteKind: {
      type: "string",
      enum: ["edge", "center"],
      description: "Mark style for note: edge (corner marks) or center.",
    },
  },
  required: ["action"],
  additionalProperties: false,
};

function cellIndex(args) {
  const { row, col } = args || {};

  if (!Number.isInteger(row) || row < 1 || row > 9) {
    throw new Error("row must be an integer from 1 to 9.");
  }
  if (!Number.isInteger(col) || col < 1 || col > 9) {
    throw new Error("col must be an integer from 1 to 9.");
  }

  return (row - 1) * 9 + (col - 1);
}

function requireDigit(args) {
  const value = args?.value;
  if (typeof value !== "string" || !/^[1-9]$/.test(value)) {
    throw new Error("value must be a digit from 1 to 9.");
  }
  return value;
}

function withMessage(runtime, result) {
  const message = describeMessage(result.message);
  const text = message ? `${message}\n\n${runtime.boardText()}` : runtime.boardText();

  return { ok: true, message, ...runtime.state(), text };
}

function puzzleListText(runtime) {
  return runtime.puzzles
    .map((puzzle) => `- ${puzzle.id}: ${puzzle.title} (${puzzle.difficulty})`)
    .join("\n");
}

function executeSudoku(runtime, args) {
  const action = typeof args?.action === "string" ? args.action : "state";

  switch (action) {
    case "state":
      return { ok: true, ...runtime.state(), text: runtime.boardText() };
    case "list":
      return {
        ok: true,
        puzzles: runtime.puzzles.map((puzzle) => ({
          id: puzzle.id,
          title: puzzle.title,
          difficulty: puzzle.difficulty,
        })),
        text: `Puzzles:\n${puzzleListText(runtime)}`,
      };
    case "new": {
      if (typeof args.puzzleId !== "string" || !args.puzzleId) {
        throw new Error("puzzleId is required for new; use action list to see ids.");
      }
      return withMessage(runtime, runtime.applyAction({ action, puzzleId: args.puzzleId }));
    }
    case "set":
      return withMessage(
        runtime,
        runtime.applyAction({
          action: "enter",
          mode: "value",
          indexes: [cellIndex(args)],
          value: requireDigit(args),
        }),
      );
    case "erase":
      return withMessage(
        runtime,
        runtime.applyAction({
          action: "enter",
          mode: "value",
          indexes: [cellIndex(args)],
          value: "",
        }),
      );
    case "note":
      return withMessage(
        runtime,
        runtime.applyAction({
          action: "enter",
          mode: args.noteKind === "center" ? "center" : "edge",
          indexes: [cellIndex(args)],
          value: requireDigit(args),
        }),
      );
    case "undo":
    case "reset":
    case "check":
    case "hint":
    case "solve":
      return withMessage(runtime, runtime.applyAction({ action }));
    default:
      throw new Error(`Unknown action: ${action}. Use one of ${ACTIONS.join(", ")}.`);
  }
}

function gridLines(grid) {
  const rows = [];

  for (let row = 0; row < 9; row += 1) {
    const cells = grid.slice(row * 9, (row + 1) * 9).split("");
    rows.push(
      `r${row + 1}  ${cells.slice(0, 3).join(" ")} | ${cells
        .slice(3, 6)
        .join(" ")} | ${cells.slice(6, 9).join(" ")}`,
    );
  }

  return rows.join("\n");
}

function solveInWorker(grid) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./solver-worker.js", import.meta.url), {
      workerData: { grid, limit: 2 },
      // Do not inherit the host's --input-type/loader flags: the worker always
      // loads a real ESM file from this package.
      execArgv: [],
    });
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      worker.terminate().catch(() => {});
      resolve({ timedOut: true });
    }, SOLVER_TIMEOUT_MS);

    worker.once("message", (message) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate().catch(() => {});
      resolve({ timedOut: false, ...message });
    });

    worker.once("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });

    worker.once("exit", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Sudoku solver worker exited with code ${code}.`));
    });
  });
}

async function executeSolve(args) {
  const raw = typeof args?.grid === "string" ? args.grid.trim() : "";

  if (!raw) {
    throw new Error("grid is required: 81 characters using 0 or . for empty cells.");
  }

  const grid = raw.replace(/[\s.]/g, "0");

  if (!/^[0-9]{81}$/.test(grid)) {
    throw new Error("grid must contain exactly 81 characters using digits 0-9 (0 or . = empty).");
  }

  const result = await solveInWorker(grid);

  if (result.timedOut) {
    return {
      ok: true,
      solvable: null,
      timedOut: true,
      grid,
      text: `The solver did not finish within ${SOLVER_TIMEOUT_MS / 1000} seconds. The grid may have many solutions or require a very expensive search.\n\n${gridLines(grid)}`,
    };
  }

  if (!result.solvable) {
    return {
      ok: true,
      solvable: false,
      solutions: 0,
      grid,
      text: `No solution exists for this grid.\n\n${gridLines(grid)}`,
    };
  }

  const text = [
    result.unique
      ? "Unique solution:"
      : "Multiple solutions (at least 2). One solution:",
    gridLines(result.solution),
    `Difficulty: ${result.difficulty} (solved by logic: ${result.solvedByLogic ? "yes" : "no"})`,
    `Techniques: ${result.techniques.length ? result.techniques.join(", ") : "none"}`,
  ].join("\n");

  return {
    ok: true,
    solvable: true,
    unique: result.unique,
    solutions: result.solutions,
    solution: result.solution,
    difficulty: result.difficulty,
    techniques: result.techniques,
    grid,
    text,
  };
}

function output() {
  return {
    schema: { type: "object" },
    render: (_args, value) => [
      { type: "text", text: value?.text || JSON.stringify(value) },
    ],
  };
}

export function registerSudokuTools(ctx, runtime) {
  ctx.effect(
    () =>
      ctx.tools.register({
        name: "sudoku",
        description:
          "Read or play the live Sudoku game in the Harness Sudoku panel. The user and the agent share one board, so moves you make appear immediately. Coordinates are row and column from 1 to 9. Prefer hint over solve unless the user explicitly asks to finish the puzzle.",
        parameters: TOOL_PARAMETERS,
        output: output(),
        timeoutMs: 30000,
        isConcurrencySafe: () => false,
        execute: async (args) => executeSudoku(runtime, args),
      }),
    "sudoku: tool",
  );

  ctx.effect(
    () =>
      ctx.tools.register({
        name: "sudoku_solve",
        description:
          "Solve or grade an arbitrary 9x9 Sudoku grid string of 81 characters (0 or . for empty). Does not touch the live game. Reports the solution, whether it is unique, and the logic-grade difficulty.",
        parameters: {
          type: "object",
          properties: {
            grid: {
              type: "string",
              description: "Exactly 81 characters; 0 or . marks an empty cell.",
            },
          },
          required: ["grid"],
          additionalProperties: false,
        },
        output: output(),
        timeoutMs: 60000,
        isConcurrencySafe: () => true,
        execute: async (args) => executeSolve(args),
      }),
    "sudoku: solver tool",
  );
}
