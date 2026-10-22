import { fileURLToPath } from "node:url";

import { SudokuRuntime } from "./lib/runtime.js";
import { registerSudokuTools } from "./lib/tools.js";

export const name = "sudoku";
export const inject = ["webServer", "connection", "tools"];

const packageRoot = fileURLToPath(new URL("./", import.meta.url));
const MAX_BODY = 64 * 1024;

function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "content-security-policy": "default-src 'none'",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }

  if (size === 0) return {};

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

async function handle(ctx, runtime, req, res) {
  try {
    const rejection = ctx.connection.requestRejection(req);

    if (rejection !== undefined) {
      res.writeHead(rejection);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", "http://localhost");
    const path = url.pathname.slice("/sudoku".length);

    if (path === "/state" && req.method === "GET") {
      sendJson(res, 200, { ok: true, state: runtime.snapshot() });
      return;
    }

    if (path === "/action" && req.method === "POST") {
      const body = await readJson(req);
      sendJson(res, 200, { ok: true, ...runtime.applyAction(body) });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found." });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function apply(ctx) {
  const runtime = new SudokuRuntime({ root: packageRoot });

  ctx.effect(() => () => runtime.dispose(), "sudoku: lifecycle");

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "prefix",
        path: "/sudoku",
        handler: (req, res) => handle(ctx, runtime, req, res),
      }),
    "sudoku: routes",
  );

  registerSudokuTools(ctx, runtime);

  return runtime;
}
