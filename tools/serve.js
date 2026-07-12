#!/usr/bin/env node
// 零依赖静态开发服务器。相比 python -m http.server 的关键区别：
// 发送 Cache-Control: no-store，浏览器每次都取最新文件，改完代码刷新即生效。

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    let filePath = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));

    if (!filePath.startsWith(ROOT)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (url.pathname.endsWith("/")) {
      filePath = path.join(filePath, "index.html");
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    response.end(body);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(PORT, () => {
  console.log(`Serving ${ROOT} at http://localhost:${PORT} (no-store cache headers)`);
});
