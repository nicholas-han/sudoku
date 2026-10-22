window.__ModuleLoader__.load({
  id: "@local/dsh-plugin-sudoku",
  factory(require) {
    "use strict";

    const React = require("react");
    const h = React.createElement;
    const PANEL_ID = "sudoku";
    const NS = "sudoku";
    const POLL_MS = 3000;

    const DICTIONARIES = {
      en: {
        panel: "Sudoku",
        puzzles: "Puzzles",
        hint: "Hint",
        reset: "Reset",
        resetConfirm: "Click again to reset",
        undo: "Undo",
        check: "Check",
        erase: "Erase",
        answer: "Answer",
        corner: "Corner",
        center: "Center",
        inputMode: "Input mode",
        pickerTitle: "Choose a puzzle",
        all: "All",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
        expert: "Expert",
        close: "Close",
        loading: "Loading the board…",
        serviceError: "The Sudoku service did not respond. Try again in a moment.",
        selectFirst: "Select a cell first.",
        cell: "Row {row}, column {col}",
        help: "Click or drag to select. Cmd/Ctrl-click toggles cells. A / S / D switch modes, Z undoes, arrow keys move.",
        modeAnswer: "Answer mode: conflicts with clue digits are highlighted.",
        modeCorner: "Corner-mark mode: a digit is only kept inside its 3×3 box.",
        modeCenter: "Center-mark mode: the cell may only contain one marked digit.",
        progress: "{filled}/81 filled",
        conflicts: "{n} conflict(s)",
        noConflicts: "No conflicts",
        noPuzzles: "No puzzles at this difficulty.",
        "msg.loaded": "Loaded {title}.",
        "msg.resetDone": "Puzzle reset.",
        "msg.undoDone": "Undo successful.",
        "msg.nothingUndo": "Nothing to undo.",
        "msg.digitsUsed": "All nine {value}s are already on the board. Erase one first.",
        "msg.centerLimit": "Center marks hold up to four digits. Repeat a digit to remove it.",
        "msg.clueLocked": "Clues cannot be changed.",
        "msg.notesLocked": "Marks can only be edited in empty player cells.",
        "msg.centerPartial": "Some center marks were already full.",
        "msg.finishedCorrect": "Congratulations!",
        "msg.finishedWrong": "Not quite. The highlighted cells are wrong.",
        "msg.cellsLeft": "{n} cells left. Finish the grid to check the answer.",
        "msg.hintNaked": "Hint: r{row}c{col} = {value} (only candidate).",
        "msg.hintHidden": "Hint: r{row}c{col} = {value} (only place in its unit).",
        "msg.hintAdvanced": "Hint: r{row}c{col} = {value} (needs advanced logic).",
        "msg.hintWrong": "r{row}c{col} does not match the solution. Consider erasing it.",
        "msg.gridFull": "The grid is full. Check the answer or undo a move.",
        "msg.solved": "Puzzle solved.",
      },
      zh: {
        panel: "数独",
        puzzles: "题库",
        hint: "提示",
        reset: "重置",
        resetConfirm: "再点一次确认重置",
        undo: "撤销",
        check: "检查",
        erase: "擦除",
        answer: "答案",
        corner: "角标",
        center: "中注",
        inputMode: "输入模式",
        pickerTitle: "选择题目",
        all: "全部",
        easy: "简单",
        medium: "中等",
        hard: "困难",
        expert: "专家",
        close: "关闭",
        loading: "正在读取棋盘…",
        serviceError: "数独服务没有响应，请稍后重试。",
        selectFirst: "请先选择一个格子。",
        cell: "第 {row} 行，第 {col} 列",
        help: "单击或拖动选择；Cmd/Ctrl+单击可多选。A / S / D 切换模式，Z 撤销，方向键移动。",
        modeAnswer: "答案模式：与给定数字冲突的格子会标红。",
        modeCorner: "角标模式：同一个 3×3 宫内标记某数字，再次点击可取消。",
        modeCenter: "中注模式：格子中最多保留四个候选数字。",
        progress: "已填 {filled}/81",
        conflicts: "{n} 处冲突",
        noConflicts: "无冲突",
        noPuzzles: "这个难度还没有题目。",
        "msg.loaded": "已载入 {title}。",
        "msg.resetDone": "题目已重置。",
        "msg.undoDone": "已撤销。",
        "msg.nothingUndo": "没有可撤销的操作。",
        "msg.digitsUsed": "九个 {value} 都已经在盘面上了，先擦掉一个再放。",
        "msg.centerLimit": "中注最多四个数字，重复点击已标记的数字即可移除。",
        "msg.clueLocked": "题目给定的数字不能修改。",
        "msg.notesLocked": "只能在空的玩家格子里编辑标记。",
        "msg.centerPartial": "部分格子的中注已经满了。",
        "msg.finishedCorrect": "恭喜，完成了！",
        "msg.finishedWrong": "还不对，标红的格子有误。",
        "msg.cellsLeft": "还剩 {n} 格，填满后再检查答案。",
        "msg.hintNaked": "提示：r{row}c{col} = {value}（唯一候选）。",
        "msg.hintHidden": "提示：r{row}c{col} = {value}（所在单元唯一位置）。",
        "msg.hintAdvanced": "提示：r{row}c{col} = {value}（需要进阶技巧）。",
        "msg.hintWrong": "r{row}c{col} 与答案不符，可以擦掉重填。",
        "msg.gridFull": "格子已经填满，请检查答案或撤销一步。",
        "msg.solved": "已解出题目。",
      },
    };

    const MESSAGE_KEYS = {
      loaded: "msg.loaded",
      "reset-done": "msg.resetDone",
      "undo-done": "msg.undoDone",
      "nothing-undo": "msg.nothingUndo",
      "digits-used": "msg.digitsUsed",
      "center-limit": "msg.centerLimit",
      "clue-locked": "msg.clueLocked",
      "notes-locked": "msg.notesLocked",
      "center-partial": "msg.centerPartial",
      "finished-correct": "msg.finishedCorrect",
      "finished-wrong": "msg.finishedWrong",
      "cells-left": "msg.cellsLeft",
      "hint-naked": "msg.hintNaked",
      "hint-hidden": "msg.hintHidden",
      "hint-advanced": "msg.hintAdvanced",
      "hint-wrong": "msg.hintWrong",
      "grid-full": "msg.gridFull",
      solved: "msg.solved",
    };

    const CSS = `
.sudoku-app {
  --s-bg: var(--dsw-alias-bg-base, #ffffff);
  --s-surface: var(--dsw-alias-bg-layer-1, #ffffff);
  --s-surface-2: var(--dsw-alias-bg-layer-2, #f3f5f8);
  --s-overlay: var(--dsw-alias-bg-overlay, #ffffff);
  --s-border: var(--dsw-alias-border-l1, #d9dde3);
  --s-border-strong: var(--dsw-alias-border-l2, #b6bdc8);
  --s-text: var(--dsw-alias-label-primary, #1b1e22);
  --s-muted: var(--dsw-alias-label-secondary, #666d77);
  --s-accent: var(--dsw-alias-brand-primary, #1f6feb);
  --s-error: var(--dsw-alias-state-error-primary, #c62828);
  --s-warn: var(--dsw-alias-state-warn-primary, #a15c00);
  --s-ok: var(--dsw-alias-state-success-primary, #1b7f3b);
  --s-idle: var(--dsw-alias-state-idle-primary, #8a9099);
  --s-sel: color-mix(in srgb, var(--s-accent) 16%, transparent);
  --s-peer: color-mix(in srgb, var(--s-accent) 7%, transparent);
  --s-same: color-mix(in srgb, var(--s-accent) 22%, transparent);
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 14px 20px 18px max(20px, var(--dsh-frame-leading-clearance, 0px));
  background: var(--s-bg);
  color: var(--s-text);
  font: inherit;
  container-type: inline-size;
}
.sudoku-app * { box-sizing: border-box; }
.sudoku-app h1, .sudoku-app h2, .sudoku-app p { margin: 0; }
.sudoku-app button { font: inherit; color: inherit; }
.sudoku-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.sudoku-brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
.sudoku-brand svg { flex: none; color: var(--s-accent); }
.sudoku-titles { min-width: 0; }
.sudoku-titles h1 { font-size: 21px; line-height: 1.2; font-weight: 560; }
.sudoku-meta {
  margin-top: 3px;
  font-size: 12.5px;
  color: var(--s-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sudoku-top-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.sudoku-btn {
  border: 1px solid var(--s-border);
  background: var(--s-surface);
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 13px;
  line-height: 1.2;
  cursor: pointer;
}
.sudoku-btn:hover:not(:disabled) { background: var(--s-surface-2); }
.sudoku-btn:disabled { opacity: 0.45; cursor: default; }
.sudoku-btn.danger {
  border-color: color-mix(in srgb, var(--s-error) 55%, transparent);
  color: var(--s-error);
}
.sudoku-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: flex-start;
  gap: 22px;
  padding-top: 16px;
}
.sudoku-stage {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.sudoku-side {
  flex: none;
  width: 228px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sudoku-progress {
  width: min(100%, 540px);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12.5px;
  color: var(--s-muted);
}
.sudoku-pill {
  border: 1px solid var(--s-border);
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 11.5px;
  white-space: nowrap;
}
.sudoku-pill.warn {
  color: var(--s-warn);
  border-color: color-mix(in srgb, var(--s-warn) 45%, transparent);
  background: color-mix(in srgb, var(--s-warn) 8%, transparent);
}
.sudoku-board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  width: min(100%, 540px);
  aspect-ratio: 1 / 1;
  border: 2px solid var(--s-border-strong);
  border-radius: 12px;
  overflow: hidden;
  background: var(--s-surface);
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.sudoku-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: 0;
  border-right: 1px solid var(--s-border);
  border-bottom: 1px solid var(--s-border);
  background: transparent;
  cursor: pointer;
  font-size: clamp(14px, 4.2cqw, 26px);
  line-height: 1;
}
.sudoku-cell:nth-child(9n) { border-right: none; }
.sudoku-cell:nth-child(n + 73) { border-bottom: none; }
.sudoku-cell:nth-child(9n + 3),
.sudoku-cell:nth-child(9n + 6) { border-right: 2px solid var(--s-border-strong); }
.sudoku-cell:nth-child(n + 19):nth-child(-n + 27),
.sudoku-cell:nth-child(n + 46):nth-child(-n + 54) {
  border-bottom: 2px solid var(--s-border-strong);
}
.sudoku-cell.given { background: var(--s-surface-2); }
.sudoku-cell.peer { background: var(--s-peer); }
.sudoku-cell.same { background: var(--s-same); }
.sudoku-cell.selected { background: var(--s-sel); box-shadow: inset 0 0 0 2px var(--s-accent); z-index: 1; }
.sudoku-cell.conflict { background: color-mix(in srgb, var(--s-error) 11%, transparent); }
.sudoku-cell.wrong { background: color-mix(in srgb, var(--s-error) 16%, transparent); }
.sudoku-cell.hinted { box-shadow: inset 0 0 0 2px var(--s-ok); }
.sudoku-value {
  color: var(--s-accent);
  font-variant-numeric: tabular-nums;
  font-weight: 520;
}
.sudoku-cell.given .sudoku-value { color: var(--s-text); font-weight: 640; }
.sudoku-cell.conflict .sudoku-value,
.sudoku-cell.wrong .sudoku-value { color: var(--s-error); font-weight: 660; }
.sudoku-edge {
  position: absolute;
  inset: 2px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  font-size: clamp(7px, 1.45cqw, 10px);
  line-height: 1;
  color: var(--s-muted);
  pointer-events: none;
}
.sudoku-edge span { display: flex; align-items: center; justify-content: center; }
.sudoku-center {
  font-size: clamp(9px, 1.9cqw, 13px);
  letter-spacing: 0.04em;
  color: var(--s-muted);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}
.sudoku-status {
  width: min(100%, 540px);
  min-height: 38px;
  font-size: 13px;
  line-height: 1.45;
  color: var(--s-muted);
  text-align: center;
}
.sudoku-modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--s-surface-2);
}
.sudoku-modes button {
  border: 0;
  border-radius: 7px;
  padding: 8px 4px;
  background: transparent;
  font-size: 13px;
  color: var(--s-muted);
  cursor: pointer;
}
.sudoku-modes button[aria-pressed="true"] {
  background: var(--s-surface);
  color: var(--s-text);
  font-weight: 560;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.sudoku-pad { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.sudoku-num {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 46px;
  border: 1px solid var(--s-border);
  border-radius: 9px;
  background: var(--s-surface);
  font-size: 19px;
  font-weight: 560;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}
.sudoku-num:hover:not(:disabled) { border-color: var(--s-accent); background: var(--s-peer); }
.sudoku-num:disabled { cursor: default; }
.sudoku-num.used { color: var(--s-idle); opacity: 0.45; text-decoration: line-through; }
.sudoku-erase { grid-column: 1 / -1; height: 40px; font-size: 14px; font-weight: 500; }
.sudoku-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.sudoku-actions button {
  padding: 9px 8px;
  border: 1px solid var(--s-border);
  border-radius: 9px;
  background: var(--s-surface);
  font-size: 13px;
  cursor: pointer;
}
.sudoku-actions button:hover:not(:disabled) { background: var(--s-surface-2); }
.sudoku-actions button:disabled { opacity: 0.45; cursor: default; }
.sudoku-help {
  border-top: 1px solid var(--s-border);
  padding-top: 10px;
  font-size: 11.5px;
  line-height: 1.55;
  color: var(--s-muted);
}
.sudoku-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 180px;
  padding: 24px;
  font-size: 13px;
  color: var(--s-muted);
  text-align: center;
}
.sudoku-loading.error { color: var(--s-error); }
.sudoku-modal {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: color-mix(in srgb, #000000 48%, transparent);
}
.sudoku-dialog {
  display: flex;
  flex-direction: column;
  width: min(440px, 92vw);
  max-height: min(560px, 82vh);
  overflow: hidden;
  border: 1px solid var(--s-border);
  border-radius: 14px;
  background: var(--s-overlay);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
}
.sudoku-dialog header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--s-border);
}
.sudoku-dialog h2 { font-size: 15px; font-weight: 560; }
.sudoku-close {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--s-muted);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.sudoku-close:hover { background: var(--s-surface-2); }
.sudoku-filters { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px 4px; }
.sudoku-filters button {
  padding: 4px 10px;
  border: 1px solid var(--s-border);
  border-radius: 999px;
  background: transparent;
  color: var(--s-muted);
  font-size: 12px;
  cursor: pointer;
}
.sudoku-filters button[aria-pressed="true"] {
  border-color: var(--s-accent);
  background: var(--s-peer);
  color: var(--s-accent);
}
.sudoku-puzzle-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: auto;
  padding: 8px 10px 12px;
}
.sudoku-puzzle-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  font-size: 13px;
  cursor: pointer;
}
.sudoku-puzzle-option:hover { background: var(--s-surface-2); }
.sudoku-puzzle-option.current { border-color: var(--s-accent); }
.sudoku-puzzle-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sudoku-badge {
  flex: none;
  padding: 2px 7px;
  border: 1px solid var(--s-border);
  border-radius: 999px;
  color: var(--s-muted);
  font-size: 10.5px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.sudoku-empty { padding: 22px 16px; text-align: center; font-size: 13px; color: var(--s-muted); }
@container (max-width: 760px) {
  .sudoku-body { flex-direction: column; align-items: stretch; }
  .sudoku-side { width: auto; }
  .sudoku-help { display: none; }
}
`;

    function translate(t, key, data) {
      let text = t(key);
      if (text === key && DICTIONARIES.en[key]) text = DICTIONARIES.en[key];
      if (!data) return text;
      return text.replace(/\{(\w+)\}/g, (match, name) =>
        data[name] === undefined ? match : String(data[name]),
      );
    }

    function fallbackTranslate(key) {
      return DICTIONARIES.en[key] || key;
    }

    function formatMessage(message, t) {
      const key = MESSAGE_KEYS[message.code];
      if (!key) return message.code;
      return translate(t, key, message.data || {});
    }

    function modeMessage(mode, t) {
      return translate(
        t,
        mode === "edge" ? "modeCorner" : mode === "center" ? "modeCenter" : "modeAnswer",
      );
    }

    function api(path, body, signal) {
      const url = new URL(`sudoku/${path}`, document.baseURI).href;
      const options = {
        method: body === undefined ? "GET" : "POST",
        headers:
          body === undefined
            ? { accept: "application/json" }
            : { accept: "application/json", "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
        signal,
      };

      return fetch(url, options).then(async (response) => {
        let data = null;
        try {
          data = await response.json();
        } catch {
          // 服务尚未就绪或返回了非 JSON 错误页。
        }

        if (!response.ok || data?.ok === false) {
          throw new Error(data?.error || `HTTP ${response.status}`);
        }

        return data;
      });
    }

    function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async function loadState() {
      let lastError;

      for (let attempt = 0; attempt < 6; attempt += 1) {
        try {
          const data = await api("state");
          return data.state;
        } catch (error) {
          lastError = error;
          await sleep(250 + attempt * 200);
        }
      }

      throw lastError;
    }

    function peerIndexes(index) {
      const peers = new Set();
      const row = Math.floor(index / 9);
      const col = index % 9;

      for (let cursor = 0; cursor < 9; cursor += 1) {
        peers.add(row * 9 + cursor);
        peers.add(cursor * 9 + col);
      }

      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;

      for (let r = boxRow; r < boxRow + 3; r += 1) {
        for (let c = boxCol; c < boxCol + 3; c += 1) {
          peers.add(r * 9 + c);
        }
      }

      peers.delete(index);
      return peers;
    }

    function rangeIndexes(start, end) {
      const startRow = Math.floor(start / 9);
      const startCol = start % 9;
      const endRow = Math.floor(end / 9);
      const endCol = end % 9;
      const indexes = new Set();

      for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row += 1) {
        for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col += 1) {
          indexes.add(row * 9 + col);
        }
      }

      return indexes;
    }

    function makeSelection(index) {
      return { indexes: new Set([index]), primary: index };
    }

    function firstEmpty(state) {
      const index = state.values.findIndex(
        (value, position) => !state.givens[position] && value === "",
      );
      return index >= 0 ? index : 0;
    }

    function SudokuIcon(props) {
      const size = props?.size || 20;

      return h(
        "svg",
        {
          viewBox: "0 0 24 24",
          width: size,
          height: size,
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 1.5,
          "aria-hidden": true,
          style: { display: "block", opacity: props?.active === false ? 0.7 : 1 },
        },
        h("rect", { x: 3.5, y: 3.5, width: 17, height: 17, rx: 2.6 }),
        h("path", {
          d: "M9.2 3.7v16.6M14.8 3.7v16.6M3.7 9.2h16.6M3.7 14.8h16.6",
          opacity: 0.85,
        }),
        h("rect", {
          x: 4.6,
          y: 4.6,
          width: 3.6,
          height: 3.6,
          fill: "currentColor",
          stroke: "none",
        }),
        h("rect", {
          x: 10.2,
          y: 10.2,
          width: 3.6,
          height: 3.6,
          fill: "currentColor",
          stroke: "none",
          opacity: 0.6,
        }),
        h("rect", {
          x: 15.8,
          y: 15.8,
          width: 3.6,
          height: 3.6,
          fill: "currentColor",
          stroke: "none",
        }),
      );
    }

    function SudokuPanel(props) {
      const t = (key, data) => translate(props.t || fallbackTranslate, key, data);
      const [state, setState] = React.useState(null);
      const [selection, setSelection] = React.useState(() => ({
        indexes: new Set(),
        primary: -1,
      }));
      const [mode, setMode] = React.useState("value");
      const [notice, setNotice] = React.useState(null);
      const [pending, setPending] = React.useState(false);
      const [picker, setPicker] = React.useState(false);
      const [pickDifficulty, setPickDifficulty] = React.useState("all");
      const [resetArmed, setResetArmed] = React.useState(false);

      const alive = React.useRef(true);
      const queueRef = React.useRef([]);
      const runningRef = React.useRef(false);
      const actionEpoch = React.useRef(0);
      const lastSerialized = React.useRef("");
      const stateRef = React.useRef(null);
      const selectionRef = React.useRef(selection);
      const modeRef = React.useRef(mode);
      const pickerRef = React.useRef(picker);
      const dragRef = React.useRef(null);
      const closeRef = React.useRef(null);
      const handlerRef = React.useRef(() => {});
      const transitionRef = React.useRef(false);

      stateRef.current = state;
      selectionRef.current = selection;
      modeRef.current = mode;
      pickerRef.current = picker;

      function applyState(next, reselect) {
        lastSerialized.current = JSON.stringify(next);
        stateRef.current = next;
        setState(next);

        if (reselect) {
          const nextSelection = makeSelection(firstEmpty(next));
          // Keep the ref in sync before React commits: a keydown arriving
          // right after the response must not use the previous puzzle's cell.
          selectionRef.current = nextSelection;
          setSelection(nextSelection);
        }
      }

      function runAction(payload, options) {
        queueRef.current.push({ payload, options });
        setPending(true);
        void drainActions();
      }

      async function drainActions() {
        if (runningRef.current) return;
        runningRef.current = true;

        try {
          while (queueRef.current.length > 0) {
            const entry = queueRef.current.shift();
            actionEpoch.current += 1;

            try {
              const data = await api("action", entry.payload);
              // 面板可能已经切走；仍然发送排队的动作，但不再更新已卸载的 UI。
              if (!alive.current) continue;
              applyState(data.state, entry.options?.reselect === true);
              if (entry.payload.action === "new") transitionRef.current = false;
              setNotice(data.message ? { message: data.message } : null);
            } catch (error) {
              console.error("[sudoku]", error);
              queueRef.current.length = 0;
              transitionRef.current = false;
              if (alive.current) setNotice({ error: true, text: t("serviceError") });
            }
          }
        } finally {
          runningRef.current = false;
          if (alive.current) setPending(false);
        }
      }

      React.useEffect(() => {
        alive.current = true;
        let cancelled = false;
        let timer = null;

        async function poll() {
          if (cancelled) return;

          // 动作进行中或排队时不要发起轮询：否则动作完成后才回来的旧
          // GET 可能带着动作前的盘面，覆盖刚应用的新状态。
          if (runningRef.current || queueRef.current.length > 0) {
            timer = setTimeout(poll, POLL_MS);
            return;
          }

          const epoch = actionEpoch.current;

          try {
            const next = await api("state");
            if (
              !cancelled &&
              !runningRef.current &&
              queueRef.current.length === 0 &&
              epoch === actionEpoch.current
            ) {
              const serialized = JSON.stringify(next.state);
              if (serialized !== lastSerialized.current) {
                applyState(next.state, false);
              }
              setNotice((current) =>
                current && current.error ? null : current,
              );
            }
          } catch {
            // 后台轮询失败不打扰进行中的对局，下一次再试。
          }

          if (!cancelled) timer = setTimeout(poll, POLL_MS);
        }

        (async () => {
          try {
            const next = await loadState();
            if (cancelled) return;
            applyState(next, true);
          } catch (error) {
            console.error("[sudoku]", error);
            if (!cancelled) setNotice({ error: true, text: t("serviceError") });
          }

          if (!cancelled) timer = setTimeout(poll, POLL_MS);
        })();

        return () => {
          cancelled = true;
          alive.current = false;
          if (timer) clearTimeout(timer);
        };
      }, []);

      React.useEffect(() => {
        if (!resetArmed) return undefined;
        const timer = setTimeout(() => setResetArmed(false), 4000);
        return () => clearTimeout(timer);
      }, [resetArmed]);

      React.useEffect(() => {
        if (picker && closeRef.current) closeRef.current.focus();
      }, [picker]);

      function selectOnly(index) {
        setSelection(makeSelection(index));
      }

      function toggleSelection(index) {
        setSelection((previous) => {
          const indexes = new Set(previous.indexes);
          if (indexes.has(index)) indexes.delete(index);
          else indexes.add(index);
          return { indexes, primary: index };
        });
      }

      function changeMode(next) {
        if (modeRef.current !== next) {
          setMode(next);
          setNotice(null);
        }
      }

      function enterValue(value) {
        if (transitionRef.current) return;

        const indexes = [...selectionRef.current.indexes];

        if (indexes.length === 0) {
          setNotice({ error: true, text: t("selectFirst") });
          return;
        }

        runAction({ action: "enter", mode: modeRef.current, indexes, value });
      }

      function undo() {
        runAction({ action: "undo" });
      }

      function check() {
        runAction({ action: "check" });
      }

      function hint() {
        runAction({ action: "hint" });
      }

      function reset() {
        if (!resetArmed) {
          setResetArmed(true);
          return;
        }

        setResetArmed(false);
        runAction({ action: "reset" }, { reselect: true });
      }

      function choosePuzzle(puzzleId) {
        setPicker(false);

        // 重新选择当前题目不应清空盘面：只有换题才发送 new。
        if (stateRef.current && stateRef.current.puzzle.id === puzzleId) return;

        // 换题请求完成前不接受单元格输入，避免旧选区的按键落到新题上。
        transitionRef.current = true;
        runAction({ action: "new", puzzleId }, { reselect: true });
      }

      function cellIndexAt(event) {
        const element = document.elementFromPoint(event.clientX, event.clientY);
        const button = element && element.closest ? element.closest("[data-cell-index]") : null;
        return button ? Number(button.dataset.cellIndex) : null;
      }

      function onPointerDown(event) {
        if (event.button !== 0 || event.metaKey || event.ctrlKey) return;

        const button = event.target.closest("[data-cell-index]");
        if (!button) return;

        const index = Number(button.dataset.cellIndex);
        dragRef.current = { pointerId: event.pointerId, start: index };

        if (event.currentTarget.setPointerCapture) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }

        selectOnly(index);
      }

      function onPointerMove(event) {
        const drag = dragRef.current;
        if (!drag || event.pointerId !== drag.pointerId) return;

        const index = cellIndexAt(event);
        if (index === null) return;

        setSelection((previous) => {
          if (previous.primary === index) return previous;
          return { indexes: rangeIndexes(drag.start, index), primary: index };
        });
      }

      function finishDrag(event) {
        if (dragRef.current && event.pointerId === dragRef.current.pointerId) {
          dragRef.current = null;
        }
      }

      function onBoardClick(event) {
        if (!(event.metaKey || event.ctrlKey)) return;

        const button = event.target.closest("[data-cell-index]");
        if (!button) return;

        toggleSelection(Number(button.dataset.cellIndex));
      }

      handlerRef.current = (event) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;

        const target = event.target;
        if (
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.tagName === "SELECT" ||
            target.isContentEditable)
        ) {
          return;
        }

        if (pickerRef.current) {
          if (event.key === "Escape") {
            setPicker(false);
            event.preventDefault();
          }
          return;
        }

        const key = event.key;
        const shortcut = { a: "value", s: "edge", d: "center" }[key.toLowerCase()];

        if (shortcut) {
          changeMode(shortcut);
          event.preventDefault();
          return;
        }

        if (key === "z" || key === "Z") {
          undo();
          event.preventDefault();
          return;
        }

        if (/^[1-9]$/.test(key)) {
          enterValue(key);
          event.preventDefault();
          return;
        }

        if (key === "Backspace" || key === "Delete" || key === "0") {
          enterValue("");
          event.preventDefault();
          return;
        }

        const current = selectionRef.current.primary;
        let next = null;

        if (current < 0) {
          if (key.startsWith("Arrow")) next = 0;
        } else {
          const row = Math.floor(current / 9);
          const col = current % 9;

          if (key === "ArrowUp" && row > 0) next = current - 9;
          else if (key === "ArrowDown" && row < 8) next = current + 9;
          else if (key === "ArrowLeft" && col > 0) next = current - 1;
          else if (key === "ArrowRight" && col < 8) next = current + 1;
        }

        if (next !== null) {
          selectOnly(next);
          event.preventDefault();
        }
      };

      React.useEffect(() => {
        const listener = (event) => handlerRef.current(event);
        window.addEventListener("keydown", listener);
        return () => window.removeEventListener("keydown", listener);
      }, []);

      if (!state) {
        return h(
          "div",
          { className: "sudoku-app" },
          h("style", null, CSS),
          h(
            "div",
            {
              className:
                notice && notice.error ? "sudoku-loading error" : "sudoku-loading",
              role: "status",
              "aria-live": "polite",
            },
            notice && notice.error ? notice.text : t("loading"),
          ),
        );
      }

      const selected = selection.primary;
      const peers = selected >= 0 ? peerIndexes(selected) : new Set();
      const selectedValue = selected >= 0 ? state.values[selected] : "";
      const conflictSet = new Set(state.conflicts);
      const wrongSet = new Set(state.check ? state.check.wrongIndexes : []);
      const pickerPuzzles =
        pickDifficulty === "all"
          ? state.puzzles
          : state.puzzles.filter((puzzle) => puzzle.difficulty === pickDifficulty);
      const status = notice
        ? notice.error
          ? notice.text
          : formatMessage(notice.message, t)
        : modeMessage(mode, t);

      function renderCell(index) {
        const value = state.values[index];
        const given = state.givens[index];
        const edgeNotes = state.edgeNotes[index];
        const centerNotes = state.centerNotes[index];
        const edgeSet = new Set(edgeNotes);
        const classes = ["sudoku-cell"];

        if (given) classes.push("given");
        if (index !== selected && peers.has(index)) classes.push("peer");
        if (
          index !== selected &&
          value !== "" &&
          selectedValue !== "" &&
          value === selectedValue
        ) {
          classes.push("same");
        }
        if (selection.indexes.has(index)) classes.push("selected");
        if (conflictSet.has(index)) classes.push("conflict");
        if (wrongSet.has(index)) classes.push("wrong");
        if (state.hint && state.hint.index === index) classes.push("hinted");

        return h(
          "button",
          {
            type: "button",
            key: index,
            className: classes.join(" "),
            "data-cell-index": index,
            "aria-pressed": selection.indexes.has(index),
            "aria-label": `${t("cell", {
              row: Math.floor(index / 9) + 1,
              col: (index % 9) + 1,
            })}${value ? `: ${value}` : ""}`,
          },
          value
            ? h("span", { className: "sudoku-value" }, value)
            : edgeNotes.length
              ? h(
                  "span",
                  { className: "sudoku-edge" },
                  Array.from({ length: 9 }, (_, position) => {
                    const digit = String(position + 1);
                    return h("span", { key: digit }, edgeSet.has(digit) ? digit : "");
                  }),
                )
              : null,
          !value && centerNotes.length
            ? h("span", { className: "sudoku-center" }, centerNotes.join(""))
            : null,
        );
      }

      const pickerElement = picker
        ? h(
            "div",
            {
              className: "sudoku-modal",
              onMouseDown: (event) => {
                if (event.target === event.currentTarget) setPicker(false);
              },
            },
            h(
              "div",
              {
                className: "sudoku-dialog",
                role: "dialog",
                "aria-modal": "true",
                "aria-label": t("pickerTitle"),
              },
              h(
                "header",
                null,
                h("h2", null, t("pickerTitle")),
                h(
                  "button",
                  {
                    type: "button",
                    className: "sudoku-close",
                    ref: closeRef,
                    "aria-label": t("close"),
                    onClick: () => setPicker(false),
                  },
                  "×",
                ),
              ),
              h(
                "div",
                { className: "sudoku-filters" },
                ["all", "easy", "medium", "hard", "expert"].map((difficulty) =>
                  h(
                    "button",
                    {
                      type: "button",
                      key: difficulty,
                      "aria-pressed": pickDifficulty === difficulty,
                      onClick: () => setPickDifficulty(difficulty),
                    },
                    t(difficulty),
                  ),
                ),
              ),
              h(
                "div",
                { className: "sudoku-puzzle-list" },
                pickerPuzzles.length === 0
                  ? h("p", { className: "sudoku-empty" }, t("noPuzzles"))
                  : pickerPuzzles.map((puzzle) =>
                      h(
                        "button",
                        {
                          type: "button",
                          key: puzzle.id,
                          className:
                            "sudoku-puzzle-option" +
                            (puzzle.id === state.puzzle.id ? " current" : ""),
                          onClick: () => choosePuzzle(puzzle.id),
                        },
                        h("span", { className: "sudoku-puzzle-title" }, puzzle.title),
                        h(
                          "span",
                          { className: "sudoku-badge" },
                          t(puzzle.difficulty || "medium"),
                        ),
                      ),
                    ),
              ),
            ),
          )
        : null;

      return h(
        "div",
        { className: "sudoku-app" },
        h("style", null, CSS),
        h(
          "header",
          { className: "sudoku-top" },
          h(
            "div",
            { className: "sudoku-brand" },
            h(SudokuIcon, { size: 22 }),
            h(
              "div",
              { className: "sudoku-titles" },
              h("h1", null, t("panel")),
              h(
                "p",
                { className: "sudoku-meta" },
                `${state.puzzle.title} · ${t(state.puzzle.difficulty)} · ${state.puzzle.id}`,
              ),
            ),
          ),
          h(
            "div",
            { className: "sudoku-top-actions" },
            h(
              "button",
              {
                type: "button",
                className: "sudoku-btn",
                disabled: pending,
                onClick: () => setPicker(true),
              },
              t("puzzles"),
            ),
            h(
              "button",
              {
                type: "button",
                className: "sudoku-btn",
                disabled: pending || state.progress.empty === 0,
                onClick: hint,
              },
              t("hint"),
            ),
            h(
              "button",
              {
                type: "button",
                className: resetArmed ? "sudoku-btn danger" : "sudoku-btn",
                disabled: pending,
                onClick: reset,
              },
              resetArmed ? t("resetConfirm") : t("reset"),
            ),
          ),
        ),
        h(
          "div",
          { className: "sudoku-body" },
          h(
            "section",
            { className: "sudoku-stage" },
            h(
              "div",
              { className: "sudoku-progress" },
              h("span", null, t("progress", { filled: state.progress.filled })),
              h(
                "span",
                {
                  className:
                    "sudoku-pill" + (state.conflicts.length ? " warn" : ""),
                },
                state.conflicts.length
                  ? t("conflicts", { n: state.conflicts.length })
                  : t("noConflicts"),
              ),
            ),
            h(
              "div",
              {
                className: "sudoku-board",
                role: "group",
                "aria-label": t("panel"),
                onPointerDown,
                onPointerMove,
                onPointerUp: finishDrag,
                onPointerCancel: finishDrag,
                onClick: onBoardClick,
              },
              state.values.map((_, index) => renderCell(index)),
            ),
            h(
              "p",
              { className: "sudoku-status", role: "status", "aria-live": "polite" },
              status,
            ),
          ),
          h(
            "aside",
            { className: "sudoku-side" },
            h(
              "div",
              { className: "sudoku-modes", role: "group", "aria-label": t("inputMode") },
              h(
                "button",
                {
                  type: "button",
                  "aria-pressed": mode === "value",
                  onClick: () => changeMode("value"),
                },
                t("answer"),
              ),
              h(
                "button",
                {
                  type: "button",
                  "aria-pressed": mode === "edge",
                  onClick: () => changeMode("edge"),
                },
                t("corner"),
              ),
              h(
                "button",
                {
                  type: "button",
                  "aria-pressed": mode === "center",
                  onClick: () => changeMode("center"),
                },
                t("center"),
              ),
            ),
            h(
              "div",
              { className: "sudoku-pad" },
              Array.from({ length: 9 }, (_, position) => {
                const digit = String(position + 1);
                const used = (state.numberCounts[digit] || 0) >= 9;

                return h(
                  "button",
                  {
                    type: "button",
                    key: digit,
                    className: used ? "sudoku-num used" : "sudoku-num",
                    disabled: pending || used,
                    onClick: () => enterValue(digit),
                    "aria-label": digit,
                  },
                  digit,
                );
              }),
              h(
                "button",
                {
                  type: "button",
                  className: "sudoku-num sudoku-erase",
                  disabled: pending,
                  onClick: () => enterValue(""),
                },
                t("erase"),
              ),
            ),
            h(
              "div",
              { className: "sudoku-actions" },
              h(
                "button",
                {
                  type: "button",
                  disabled: pending || state.history === 0,
                  onClick: undo,
                },
                t("undo"),
              ),
              h(
                "button",
                { type: "button", disabled: pending, onClick: check },
                t("check"),
              ),
            ),
            h("p", { className: "sudoku-help" }, t("help")),
          ),
        ),
        pickerElement,
      );
    }

    function apply(ctx) {
      ctx.effect(
        () => ctx.locale.register(NS, DICTIONARIES),
        "sudoku: locale",
      );

      const t = ctx.locale.bind(NS);

      ctx.effect(
        () =>
          ctx.slots.inject("main", () =>
            ctx.slots.register(
              { name: "main", key: PANEL_ID, locale: NS },
              SudokuPanel,
            ),
          ),
        "sudoku: panel",
      );

      ctx.effect(
        () =>
          ctx.slots.inject("sidebar.panellist", () =>
            ctx.slots.register(
              {
                name: "sidebar.panellist",
                id: PANEL_ID,
                order: 13,
                label: () => t("panel"),
                locale: NS,
              },
              SudokuIcon,
            ),
          ),
        "sudoku: sidebar entry",
      );
    }

    return { inject: ["slots", "locale"], apply, SudokuPanel, SudokuIcon };
  },
});
