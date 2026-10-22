import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// 进度属于这台机器上的这份 Harness，而不是某个会话：游戏面板与智能体
// 工具读同一份状态，重启 Harness 后还能接着下。
export function defaultDataDirectory() {
  const home = process.env.DSH_HOME || join(homedir(), ".dsh");
  return join(home, "sudoku");
}

export class ProgressStore {
  constructor(directory = defaultDataDirectory()) {
    this.directory = directory;
    this.file = join(directory, "progress.json");
  }

  read() {
    try {
      if (!existsSync(this.file)) return null;
      return JSON.parse(readFileSync(this.file, "utf8"));
    } catch {
      return null;
    }
  }

  write(value) {
    try {
      mkdirSync(this.directory, { recursive: true });
      const temporary = `${this.file}.tmp`;
      writeFileSync(temporary, JSON.stringify(value), "utf8");
      renameSync(temporary, this.file);
    } catch (error) {
      // 进度是便利功能：磁盘不可写时游戏仍应继续。
      console.warn(`[sudoku] cannot save progress: ${error.message}`);
    }
  }

  clear() {
    try {
      rmSync(this.file, { force: true });
    } catch {
      // 同上，清理失败不影响游戏。
    }
  }
}
