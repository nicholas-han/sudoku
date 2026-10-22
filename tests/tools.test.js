import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { after, describe, it } from "node:test";

import { apply } from "../index.js";
import { fallbackPuzzle } from "../src/storage.js";

const directories = [];

function installed({ rejection } = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), "sudoku-tools-"));
  directories.push(dataDir);
  process.env.DSH_HOME = join(dataDir, "home");

  const effects = [];
  const routes = [];
  const tools = new Map();
  const ctx = {
    effect(callback) {
      const dispose = callback();
      effects.push(dispose);
      return () => {};
    },
    webServer: {
      register(route) {
        routes.push(route);
        return () => {};
      },
    },
    connection: {
      requestRejection() {
        return rejection;
      },
    },
    tools: {
      register(definition) {
        tools.set(definition.name, definition);
        return () => {};
      },
    },
  };

  const runtime = apply(ctx);
  return { runtime, tools, routes, effects };
}

function request(method, url, body) {
  const chunks =
    body === undefined
      ? []
      : [Buffer.from(typeof body === "string" ? body : JSON.stringify(body))];
  const req = Readable.from(chunks);
  req.method = method;
  req.url = url;
  req.headers = {};
  return req;
}

function response() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers || {};
      return this;
    },
    end(body) {
      this.body = body === undefined ? "" : String(body);
    },
  };
}

after(() => {
  delete process.env.DSH_HOME;
  for (const directory of directories) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("host plugin", () => {
  it("registers the route and both tools", () => {
    const { tools, routes } = installed();

    assert.deepEqual([...tools.keys()].sort(), ["sudoku", "sudoku_solve"]);
    assert.equal(routes.length, 1);
    assert.equal(routes[0].kind, "prefix");
    assert.equal(routes[0].path, "/sudoku");
  });

  it("reads and plays the live game through the sudoku tool", async () => {
    const { tools } = installed();
    const sudoku = tools.get("sudoku");

    const state = await sudoku.execute({ action: "state" });
    assert.equal(state.board.length, 81);
    assert.equal(state.puzzle.id, "classic-001");

    const placed = await sudoku.execute({ action: "set", row: 1, col: 3, value: "4" });
    assert.equal(placed.board[2], "4");

    const listed = await sudoku.execute({ action: "list" });
    assert.equal(listed.puzzles.length, 2);

    await assert.rejects(() => sudoku.execute({ action: "new", puzzleId: "missing" }));
    await assert.rejects(() => sudoku.execute({ action: "set", row: 0, col: 1, value: "1" }));
  });

  it("solves an arbitrary grid through the sudoku_solve tool", async () => {
    const { tools } = installed();
    const solver = tools.get("sudoku_solve");

    const result = await solver.execute({ grid: fallbackPuzzle.puzzle });
    assert.equal(result.solvable, true);
    assert.equal(result.unique, true);
    assert.equal(result.solution, fallbackPuzzle.solution);
    assert.match(result.text, /Unique solution/);

    const invalid = await solver.execute({ grid: "0".repeat(81) });
    assert.equal(invalid.solutions, 2);
    assert.equal(invalid.unique, false);

    await assert.rejects(() => solver.execute({ grid: "123" }));
  });

  it("renders tool output as text blocks", () => {
    const { tools } = installed();
    const blocks = tools.get("sudoku").output.render({}, { text: "hello" });
    assert.deepEqual(blocks, [{ type: "text", text: "hello" }]);
  });

  it("serves state and actions over the /sudoku route", async () => {
    const { routes } = installed();
    const route = routes[0];

    let res = response();
    await route.handler(request("GET", "/sudoku/state"), res);
    assert.equal(res.statusCode, 200);

    let data = JSON.parse(res.body);
    assert.equal(data.ok, true);
    assert.equal(data.state.values.length, 81);
    assert.equal(data.state.values[2], "");

    res = response();
    await route.handler(
      request("POST", "/sudoku/action", {
        action: "enter",
        mode: "value",
        indexes: [2],
        value: "4",
      }),
      res,
    );
    assert.equal(res.statusCode, 200);

    data = JSON.parse(res.body);
    assert.equal(data.state.values[2], "4");
    assert.equal(data.message, null);

    res = response();
    await route.handler(request("POST", "/sudoku/action", { action: "nope" }), res);
    assert.equal(res.statusCode, 400);
    assert.equal(JSON.parse(res.body).ok, false);
  });

  it("rejects untrusted requests and malformed action bodies", async () => {
    const rejected = installed({ rejection: 401 });
    let res = response();
    await rejected.routes[0].handler(request("GET", "/sudoku/state"), res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body, "");

    const accepted = installed();
    res = response();
    await accepted.routes[0].handler(
      request("POST", "/sudoku/action", "{not json"),
      res,
    );
    assert.equal(res.statusCode, 400);
    assert.match(JSON.parse(res.body).error, /JSON/);
  });
});
