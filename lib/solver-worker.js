import { parentPort, workerData } from "node:worker_threads";

import { countSolutions, solve } from "../src/backtracker.js";
import { gradePuzzle } from "../src/grader.js";

// 任意盘面的搜索放在 worker 里：困难或病态盘面再慢也只占一个线程，
// 不会阻塞 Harness 的 HTTP、工具和其他事件。
const { grid, limit } = workerData;
const solutions = countSolutions(grid, limit);

if (solutions === 0) {
  parentPort.postMessage({ solutions: 0, solvable: false });
} else {
  const solution = solve(grid);
  const grade = gradePuzzle(grid);

  parentPort.postMessage({
    solvable: true,
    solutions,
    unique: solutions === 1,
    solution,
    difficulty: grade.difficulty,
    solvedByLogic: grade.solved,
    techniques: grade.techniquesUsed,
  });
}
