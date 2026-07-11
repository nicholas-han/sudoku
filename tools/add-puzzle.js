#!/usr/bin/env node
// 题库录入 CLI：照片 OCR 或 --grid 手动录入 → 校验 → 查重 → 评级 → 写入题库。
//
//   node tools/add-puzzle.js photo.jpg [--provider ollama|glm|anthropic|deepseek]
//   node tools/add-puzzle.js --grid <81位串> [--difficulty hard] [--source "书名 p.12"]
//   node tools/add-puzzle.js --rebuild

import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

import { DIFFICULTIES } from "../src/constants.js";
import { canonicalKey } from "../src/canonical.js";
import { gradePuzzle } from "../src/grader.js";
import { countSolutions, solve } from "../src/solver.js";
import { normalizeIndex } from "../src/storage.js";
import { recognizeGrid } from "./lib/ocr.js";
import {
  applyCellEdit,
  buildIndexEntry,
  buildPuzzleJson,
  findDuplicate,
  nextId,
  rebuildIndex,
  renderAsciiGrid,
  sanityCheckGivens,
} from "./lib/import.js";

const PUZZLES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "puzzles");
const INDEX_PATH = path.join(PUZZLES_DIR, "index.json");

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      grid: { type: "string" },
      provider: { type: "string", default: "ollama" },
      model: { type: "string" },
      "base-url": { type: "string" },
      difficulty: { type: "string" },
      title: { type: "string" },
      source: { type: "string" },
      yes: { type: "boolean", default: false },
      rebuild: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    printUsage();
    return;
  }

  if (values.rebuild) {
    await runRebuild();
    return;
  }

  if (values.difficulty && !DIFFICULTIES.includes(values.difficulty)) {
    fail(`--difficulty must be one of: ${DIFFICULTIES.join(", ")}`);
  }

  const imagePath = positionals[0] ?? null;
  if (!imagePath && !values.grid) {
    printUsage();
    fail("Provide a photo path or --grid.");
  }

  // 1. 取得盘面：OCR 或手动
  let grid;
  let source;
  if (values.grid) {
    grid = values.grid.trim();
    source = { kind: "manual", note: values.source ?? null };
  } else {
    console.log(`Recognizing ${imagePath} via ${values.provider}...`);
    const result = await recognizeGrid({
      provider: values.provider,
      model: values.model,
      baseUrl: values["base-url"],
      imagePath,
    });
    grid = result.grid;
    source = {
      kind: "photo",
      provider: values.provider,
      model: result.model,
      image: path.basename(imagePath),
      note: values.source ?? null,
    };
  }

  // 2-4. 人工确认循环 + 唯一解校验
  const confirmed = await confirmLoop(grid, values.yes);
  if (confirmed === null) {
    console.log("Aborted.");
    process.exitCode = 1;
    return;
  }
  grid = confirmed;

  const solution = solve(grid);

  // 5. 查重
  const index = normalizeIndex(JSON.parse(await readFile(INDEX_PATH, "utf8")));
  const canonical = canonicalKey(grid);
  const duplicate = findDuplicate(index, canonical);
  if (duplicate) {
    fail(
      `Duplicate puzzle: isomorphic to ${duplicate.id} ("${duplicate.title}"). Nothing written.`,
    );
  }

  // 6. 评级
  let difficulty = values.difficulty;
  if (!difficulty) {
    const graded = gradePuzzle(grid);
    difficulty = graded.difficulty;
    console.log(
      `Auto-graded difficulty: ${difficulty}` +
        (graded.techniquesUsed.length ? ` (techniques: ${graded.techniquesUsed.join(", ")})` : ""),
    );
  }

  // 7. 写入
  const id = nextId(index);
  const puzzleJson = buildPuzzleJson({
    id,
    title: values.title ?? `Classic ${id.slice("classic-".length)}`,
    grid,
    solution,
    difficulty,
    source,
    createdAt: new Date().toISOString(),
  });

  await writeFile(
    path.join(PUZZLES_DIR, `${id}.json`),
    JSON.stringify(puzzleJson, null, 2) + "\n",
  );

  index.puzzles.push(buildIndexEntry(puzzleJson));
  index.updatedAt = puzzleJson.createdAt;
  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");

  console.log(`\nSaved puzzles/${id}.json (${difficulty}) and updated the index.`);
}

// 返回确认后的盘面，或 null 表示放弃。
// 硬错误（字符/提示数/给定冲突/解数异常）不允许接受，但可以修完再接受。
async function confirmLoop(initialGrid, autoYes) {
  let grid = initialGrid;
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    for (;;) {
      const { errors, warnings } = sanityCheckGivens(grid);

      if (errors.length === 0) {
        const solutions = countSolutions(grid);
        if (solutions === 0) {
          errors.push("This grid has NO solution - almost certainly an OCR error.");
        } else if (solutions > 1) {
          errors.push("This grid has MULTIPLE solutions - a given digit is probably missing.");
        }
      }

      console.log("\n" + renderAsciiGrid(grid));
      const givens = grid.split("").filter((ch) => ch !== "0").length;
      console.log(`\nGivens: ${givens}`);
      for (const error of errors) console.log(`  ERROR: ${error}`);
      for (const warning of warnings) console.log(`  WARNING: ${warning}`);

      if (autoYes && errors.length === 0 && warnings.length === 0) {
        return grid;
      }

      const answer = (
        await rl.question("\n[a]ccept  [p]aste 81-char grid  [rXcY=N] edit cell  [q]uit > ")
      ).trim();

      if (answer === "q") {
        return null;
      }
      if (answer === "a") {
        if (errors.length > 0) {
          console.log("Cannot accept while errors remain - fix them or quit.");
          continue;
        }
        return grid;
      }
      if (answer === "p") {
        const pasted = (await rl.question("Paste 81 characters (0 = empty): ")).trim();
        if (/^[0-9]{81}$/.test(pasted)) {
          grid = pasted;
        } else {
          console.log("Not a valid 81-digit string.");
        }
        continue;
      }
      if (answer) {
        try {
          grid = applyCellEdit(grid, answer);
        } catch (error) {
          console.log(error.message);
        }
      }
    }
  } finally {
    rl.close();
  }
}

async function runRebuild() {
  const files = (await readdir(PUZZLES_DIR)).filter(
    (name) => name.endsWith(".json") && name !== "index.json",
  );
  const puzzles = [];
  for (const file of files) {
    puzzles.push(JSON.parse(await readFile(path.join(PUZZLES_DIR, file), "utf8")));
  }
  const index = rebuildIndex(puzzles, new Date().toISOString());
  await writeFile(INDEX_PATH, JSON.stringify(index, null, 2) + "\n");
  console.log(`Rebuilt index with ${index.puzzles.length} puzzles.`);
}

function printUsage() {
  console.log(`Usage:
  node tools/add-puzzle.js <photo.jpg|png|webp> [options]
  node tools/add-puzzle.js --grid <81 digits> [options]
  node tools/add-puzzle.js --rebuild

Options:
  --provider <p>    ollama (default, local) | glm | anthropic | deepseek
  --model <m>       override the provider's default model
  --base-url <u>    override the provider's base URL
  --difficulty <d>  ${DIFFICULTIES.join(" | ")} (default: auto-graded)
  --title <t>       puzzle title (default: "Classic NNN")
  --source <note>   provenance note, e.g. "Sudoku Book vol.2 p.34"
  --yes             skip confirmation when there are no errors or warnings

API keys via environment: ANTHROPIC_API_KEY, GLM_API_KEY, DEEPSEEK_API_KEY (ollama needs none).`);
}

main().catch((error) => {
  fail(error.message);
});

function fail(message) {
  console.error(message);
  process.exit(1);
}
