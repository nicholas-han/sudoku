# sudoku

A lightweight browser Sudoku game prototype. Plain HTML/CSS/JS modules — no framework, no build step, no dependencies.

## Features

- Puzzle bank: pick a puzzle from the dropdown, optionally filtered by difficulty.
- Answer mode: enter final digits.
- Corner Marks: track 1-9 candidates around the edge of a cell.
- Center Marks: track up to 4 digits in the middle of a cell; repeat a digit to remove it.
- Multi-select: drag with the left mouse button to select a rectangle of cells, or Cmd/Ctrl+click to toggle individual cells in and out of the selection. Digits and marks apply to every selected cell; given clues are skipped.
- Undo: reverts values, marks, and any peer marks that were auto-removed when a digit was placed.
- Red conflict hints only show entries that directly clash with given clues.
- Once all nine copies of a digit are on the board, that digit is grayed out on the number pad and cannot be entered again; erasing one frees it up.
- Final answer checking happens only after the grid is full.

## Keyboard

| Key | Action |
| --- | --- |
| `1`-`9` | Enter digit / toggle mark (per current mode) |
| `Backspace` / `Delete` / `0` | Erase selected cells |
| `A` / `S` / `D` | Switch to Answer / Corner / Center mode |
| `Z` | Undo |
| Arrow keys | Move the selection (stops at board edges) |

Shortcuts never intercept system combos (Cmd/Ctrl/Alt + key passes through).

## Run

```bash
npm run serve
```

Then open `http://localhost:8000`.

## Project Layout

- `src/game.js` — game state and rules: values, marks, conflicts, digit counts, undo history. No DOM access.
- `src/backtracker.js` — exhaustive backtracking search; `solve()` and `countSolutions()` for uniqueness validation. Always finds the answer, no logic techniques involved.
- `src/grader.js` — modular difficulty grader: a rule-based, human-style solver; add techniques to the `TECHNIQUES` registry to refine grades.
- `src/canonical.js` — isomorphism canonical form (8 symmetries × digit relabeling) used for dedup.
- `src/selection.js` — pure helper for rectangular multi-select ranges.
- `src/storage.js` — puzzle/index loading, format validation, embedded fallbacks.
- `src/ui.js` — DOM rendering and input handling (mouse, keyboard, drag selection, puzzle picker).
- `tools/add-puzzle.js` — puzzle import CLI (see below).
- `tools/serve.js` — zero-dependency dev server with no-store cache headers.
- `tests/` — unit tests for everything above except `ui.js`.

## Importing Puzzles

`tools/add-puzzle.js` adds puzzles to the bank from a photo (OCR) or by hand:

```bash
# OCR a photo with a local model via Ollama (default; no key, no cloud)
node tools/add-puzzle.js photos/IMG_1234.jpg

# other providers (need the matching env var)
node tools/add-puzzle.js p.jpg --provider anthropic   # ANTHROPIC_API_KEY
node tools/add-puzzle.js p.jpg --provider glm         # GLM_API_KEY
# --provider deepseek exists but errors until their API accepts images

# manual entry without a photo
node tools/add-puzzle.js --grid 530070000...  --source "Sudoku Book vol.2 p.34"

# optionally enter the printed answer as a cross-check (works with photos too)
node tools/add-puzzle.js --grid 530070000... --solution 534678912...

# regenerate puzzles/index.json from the puzzle files
node tools/add-puzzle.js --rebuild
```

The pipeline shows the recognized grid for confirmation (with per-cell
edits like `r3c5=7`), rejects grids without a unique solution, dedups
against the bank up to rotation/mirroring/digit relabeling, auto-grades
difficulty (`--difficulty` overrides), and writes the puzzle JSON plus
an index entry. The stored `solution` always comes from the solver;
`--solution` lets you enter the printed answer as a cross-check — any
disagreement with the givens or the solver aborts the import, catching
transcription errors on either side. For local OCR, install [Ollama](https://ollama.com) and
pull a small vision model such as `qwen3-vl` or `minicpm-v`.

OCR caveat: vision models love to *solve* the puzzle instead of
transcribing it. The prompt forbids it and the tool warns when a grid
has suspiciously many givens — compare against the photo before
accepting. Keep photos out of the repo (`photos/` is gitignored); only
the file name is recorded in the puzzle's `source` field.

## Test

Tests run on the built-in Node.js test runner (Node 18+, no dependencies):

```bash
npm test
```

## Puzzle Format

Puzzles are stored as JSON. The current format version is `sudoku-v1`.
See `puzzles/classic-001.json` for an example.

Core fields:

- `puzzle`: 81 characters; `0` means empty.
- `solution`: 81 characters; the completed answer.
- `type`: currently supports `classic-9x9`.
- `difficulty`: `easy | medium | hard | expert` (auto-graded on import).
- `rules`: rule list for future variants.
- `source` (optional): provenance — `kind` (`photo`/`manual`), OCR `provider`/`model`, photo `image` basename, free-form `note`.
- `createdAt` (optional): import timestamp.

`puzzles/index.json` (`sudoku-index-v1`) is the bank manifest the game
loads for the puzzle picker. Each entry carries `id`, `file`, `title`,
`difficulty`, and the puzzle's `canonical` key used for duplicate
detection. It is maintained by the import tool; rebuild it any time
with `--rebuild`.

```json
{
  "format": "sudoku-v1",
  "id": "classic-001",
  "title": "Starter Puzzle 001",
  "type": "classic-9x9",
  "difficulty": "easy",
  "puzzle": "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
  "solution": "534678912672195348198342567859761423426853791713924856961537284287419635345286179",
  "rules": ["classic"],
  "tags": ["beginner"]
}
```
