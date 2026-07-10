# sudoku

A lightweight browser Sudoku game prototype.

## Features

- Answer mode: enter final digits.
- Corner Marks: track 1-9 candidates around the edge of a cell.
- Center Marks: track up to 4 digits in the middle of a cell; repeat a digit to remove it.
- Drag with the left mouse button to select multiple cells, then apply the current input mode to all selected cells.
- Red conflict hints only show entries that directly clash with given clues.
- Final answer checking happens only after the grid is full.

## Run

```bash
npm run serve
```

Then open `http://localhost:8000`.

## Test

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
- `rules`: rule list for future variants.

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
