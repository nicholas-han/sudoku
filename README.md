# Sudoku for DeepSeek Harness

A Sudoku game that runs as a DeepSeek Harness plugin. The board opens as its own
panel in the Harness Web UI, and the agent shares the same game: it can read the
position, place or erase digits, add marks, undo, check, hint, or solve.

There is no standalone web app and no build step. The package is plain ESM plus
one browser module, and the puzzle bank stays human-readable JSON.

## Features

- **Panel in the Harness UI.** A Sudoku icon appears in the sidebar panel list;
  clicking it opens the board without starting a separate server or window.
- **Puzzle bank.** Choose a puzzle from the bank and filter by difficulty.
- **Answer, Corner, and Center modes.** Enter final digits, corner marks, or up
  to four center marks per cell.
- **Multi-select.** Drag a rectangle, or Cmd/Ctrl-click to toggle cells. Digits
  and marks apply to every selected cell; given clues are skipped.
- **Queued input.** Actions typed while a move is still in flight run in order
  instead of being dropped.
- **Undo.** Reverts values, marks, and peer marks that were automatically
  removed when a digit was placed.
- **Conflict hints.** Entries that clash with a given clue are highlighted.
  Wrong-cell highlighting appears only after the grid is full.
- **Progress persistence.** The active puzzle and full undo history are stored
  in `$DSH_HOME/sudoku/progress.json`, so the game survives a Harness restart.
- **Agent tools.** `sudoku` reads and plays the live board; `sudoku_solve`
  solves or grades any 81-character grid.
- **Bilingual UI.** English and Chinese dictionaries ship with the plugin and
  follow the Harness locale.

## Install

The package is itself a DSH bundle: `package.json` declares `dsh.bundle.patch`
and `dsh.client`, and `cordis.patch.yml` inserts the `sudoku` row. Install this
checkout as a local bundle in the current profile and enable it. The host half
registers the `/sudoku` route, the tools, and the runtime; the client half
registers the sidebar entry and the `main` panel.

The plugin needs the Web profile services `webServer`, `connection`, and
`tools`. No configuration is required.

## Keyboard

| Key | Action |
| --- | --- |
| `1`-`9` | Enter a digit or toggle a mark, depending on the mode |
| `Backspace` / `Delete` / `0` | Erase the selected cells |
| `A` / `S` / `D` | Answer / Corner / Center mode |
| `Z` | Undo |
| Arrow keys | Move the selection |

Shortcuts never intercept Cmd/Ctrl/Alt combinations, and they are ignored while
an input, textarea, or contenteditable element has focus.

## Agent tools

### `sudoku`

Operates on the panel's live game. Actions:

| Action | Meaning |
| --- | --- |
| `state` | Read the board, notes, conflicts, and progress |
| `list` | List puzzle ids and difficulties |
| `new` | Load a puzzle by `puzzleId` |
| `set` / `erase` | Place or clear a digit at `row`, `col` (1-9) |
| `note` | Toggle an `edge` or `center` mark |
| `undo` / `reset` / `check` | Same as the panel buttons |
| `hint` | Place the next logic hint (or point out a wrong cell) |
| `solve` | Fill the whole board from the stored solution |

### `sudoku_solve`

Takes an 81-character grid (`0` or `.` for empty) and returns the solution,
whether it is unique, and the logic-grade difficulty. It does not touch the
live game. Grid analysis runs in a worker thread with an 8-second budget; a
pathological grid returns a timeout result instead of blocking the Harness
event loop.

## Puzzle bank

`puzzles/index.json` lists the bank; each puzzle file is a complete `sudoku-v1`
record. The plugin loads the bank at activation, so restart the plugin after
adding puzzles.

`tools/add-puzzle.js` still maintains the bank from a photo (OCR) or by hand:

```bash
# OCR a photo with a local model via Ollama (default; no key, no cloud)
node tools/add-puzzle.js photos/IMG_1234.jpg

# other providers (need the matching env var)
node tools/add-puzzle.js p.jpg --provider anthropic   # ANTHROPIC_API_KEY
node tools/add-puzzle.js p.jpg --provider glm         # GLM_API_KEY

# manual entry without a photo
node tools/add-puzzle.js --grid 530070000...  --source "Sudoku Book vol.2 p.34"

# optionally enter the printed answer as a cross-check
node tools/add-puzzle.js --grid 530070000... --solution 534678912...

# regenerate puzzles/index.json from the puzzle files
node tools/add-puzzle.js --rebuild
```

The pipeline validates the grid, requires a unique solution, deduplicates up to
rotation/mirroring/digit relabeling, grades the difficulty, and writes the
puzzle JSON plus its index entry. For local OCR, install
[Ollama](https://ollama.com) and pull a small vision model such as `qwen3-vl` or
`minicpm-v`. Keep photos out of the repo (`photos/` is gitignored).

## Project layout

- `index.js` — Host plugin: `/sudoku` HTTP route, lifecycle, tool registration.
- `client.js` — Browser half: sidebar entry, panel, keyboard, selection, CSS.
- `lib/runtime.js` — Authoritative game state and every action; both the panel
  and the tools call it.
- `lib/bank.js` — Loads and validates the puzzle bank from `puzzles/`.
- `lib/store.js` — Progress file under `$DSH_HOME/sudoku/`.
- `lib/tools.js` — `sudoku` and `sudoku_solve` tool definitions.
- `lib/solver-worker.js` — Isolated worker for arbitrary-grid solving.
- `src/game.js` — Game rules: values, marks, conflicts, digit counts, undo.
- `src/backtracker.js` — Backtracking solver and solution counter.
- `src/grader.js` — Rule-based difficulty grader and technique registry.
- `src/canonical.js` — Isomorphism canonical form used for deduplication.
- `src/storage.js` — Puzzle/index normalization and validation.
- `puzzles/` — The puzzle bank and its manifest.
- `tools/add-puzzle.js` — Puzzle import CLI.
- `tests/` — Node.js unit tests.

## Test

```bash
npm test
```

The suite covers the engine, the import pipeline, and the host runtime (moves,
marks, undo, hints, checks, puzzle switching, and persistence). The browser
panel itself is verified in the running Harness.

## Puzzle format

Puzzles are stored as JSON. The current format version is `sudoku-v1`; see
`puzzles/classic-001.json` for an example.

Core fields:

- `puzzle`: 81 characters; `0` means empty.
- `solution`: 81 characters; the completed answer.
- `type`: currently `classic-9x9`.
- `difficulty`: `easy | medium | hard | expert` (auto-graded on import).
- `rules`: rule list for future variants.
- `source` (optional): provenance.
- `createdAt` (optional): import timestamp.

`puzzles/index.json` (`sudoku-index-v1`) is the manifest. Each entry carries
`id`, `file`, `title`, `difficulty`, and the puzzle's `canonical` key used for
duplicate detection. It is maintained by the import tool and can be rebuilt any
time with `--rebuild`.
