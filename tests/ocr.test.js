import assert from "node:assert/strict";
import { rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import {
  OCR_PROMPT,
  PRESETS,
  buildAnthropicRequest,
  buildOpenAiRequest,
  extractResponseText,
  mediaTypeForFile,
  parseGridFromResponse,
  recognizeGrid,
} from "../tools/lib/ocr.js";
import { fallbackPuzzle } from "../src/storage.js";

const GRID = fallbackPuzzle.puzzle;
const NINE_LINES = GRID.match(/.{9}/g).join("\n");

describe("presets", () => {
  it("cover the four providers with sane shapes", () => {
    for (const name of ["anthropic", "glm", "deepseek", "ollama"]) {
      const preset = PRESETS[name];
      assert.ok(preset, name);
      assert.ok(["anthropic", "openai"].includes(preset.adapter));
      assert.match(preset.baseUrl, /^https?:\/\//);
      assert.equal(typeof preset.defaultModel, "string");
    }
    assert.equal(PRESETS.ollama.envKey, null);
    assert.equal(PRESETS.deepseek.vision, false);
  });
});

describe("request builders", () => {
  const args = {
    baseUrl: "https://example.test",
    model: "test-model",
    apiKey: "sk-123",
    imageBase64: "AAAA",
    mediaType: "image/jpeg",
  };

  it("anthropic: URL, headers, and body shape", () => {
    const request = buildAnthropicRequest(args);
    assert.equal(request.url, "https://example.test/v1/messages");
    assert.equal(request.headers["x-api-key"], "sk-123");
    assert.equal(request.headers["anthropic-version"], "2023-06-01");
    assert.equal(request.body.model, "test-model");
    assert.equal(request.body.temperature, 0);
    const [image, text] = request.body.messages[0].content;
    assert.equal(image.source.data, "AAAA");
    assert.equal(image.source.media_type, "image/jpeg");
    assert.equal(text.text, OCR_PROMPT);
  });

  it("openai: URL, bearer auth, data-URL image", () => {
    const request = buildOpenAiRequest(args);
    assert.equal(request.url, "https://example.test/chat/completions");
    assert.equal(request.headers.authorization, "Bearer sk-123");
    const [image, text] = request.body.messages[0].content;
    assert.equal(image.image_url.url, "data:image/jpeg;base64,AAAA");
    assert.equal(text.text, OCR_PROMPT);
  });

  it("openai without key (ollama) omits the auth header", () => {
    const request = buildOpenAiRequest({ ...args, apiKey: null });
    assert.equal(request.headers.authorization, undefined);
  });
});

describe("mediaTypeForFile", () => {
  it("maps common extensions", () => {
    assert.equal(mediaTypeForFile("a.JPG"), "image/jpeg");
    assert.equal(mediaTypeForFile("a.png"), "image/png");
    assert.equal(mediaTypeForFile("a.webp"), "image/webp");
  });

  it("rejects HEIC with a conversion hint", () => {
    assert.throws(() => mediaTypeForFile("IMG_1.HEIC"), /Convert to JPEG/);
  });

  it("rejects unknown extensions", () => {
    assert.throws(() => mediaTypeForFile("a.gif"), /Unsupported image type/);
  });
});

describe("parseGridFromResponse", () => {
  it("parses clean 9-line output", () => {
    assert.equal(parseGridFromResponse(NINE_LINES), GRID);
  });

  it("parses a single 81-digit run", () => {
    assert.equal(parseGridFromResponse(GRID), GRID);
  });

  it("parses chatty output with code fences", () => {
    const chatty = "Here is the grid:\n```\n" + NINE_LINES + "\n```\nGood luck!";
    assert.equal(parseGridFromResponse(chatty), GRID);
  });

  it("throws on too few digits, quoting the raw response", () => {
    assert.throws(() => parseGridFromResponse(GRID.slice(0, 80)), /got 80 digits/);
  });
});

describe("extractResponseText", () => {
  it("reads anthropic and openai response shapes", () => {
    assert.equal(
      extractResponseText("anthropic", { content: [{ type: "text", text: "abc" }] }),
      "abc",
    );
    assert.equal(
      extractResponseText("openai", { choices: [{ message: { content: "xyz" } }] }),
      "xyz",
    );
  });
});

describe("recognizeGrid", () => {
  it("deepseek preset fails before any network call", async () => {
    let fetched = false;
    await assert.rejects(
      recognizeGrid({
        provider: "deepseek",
        imagePath: "x.jpg",
        env: { DEEPSEEK_API_KEY: "k" },
        fetchImpl: () => {
          fetched = true;
        },
      }),
      /does not accept image input/,
    );
    assert.equal(fetched, false);
  });

  it("fails fast when the provider's API key is missing", async () => {
    await assert.rejects(
      recognizeGrid({ provider: "glm", imagePath: "x.jpg", env: {} }),
      /Missing GLM_API_KEY/,
    );
  });

  it("rejects unknown providers", async () => {
    await assert.rejects(
      recognizeGrid({ provider: "nope", imagePath: "x.jpg", env: {} }),
      /Unknown provider/,
    );
  });

  it("end-to-end with an injected fake fetch (ollama path)", async () => {
    const imagePath = path.join(os.tmpdir(), `sudoku-ocr-test-${process.pid}.png`);
    await writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const calls = [];
    const fakeFetch = async (url, init) => {
      calls.push({ url, init: JSON.parse(init.body) });
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: NINE_LINES } }] }),
      };
    };

    try {
      const result = await recognizeGrid({
        provider: "ollama",
        imagePath,
        env: {},
        fetchImpl: fakeFetch,
      });

      assert.equal(result.grid, GRID);
      assert.equal(result.model, PRESETS.ollama.defaultModel);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, "http://localhost:11434/v1/chat/completions");
      assert.match(calls[0].init.messages[0].content[0].image_url.url, /^data:image\/png;base64,/);
    } finally {
      await rm(imagePath, { force: true });
    }
  });

  it("rejects non-image files without any network call", async () => {
    let fetched = false;
    await assert.rejects(
      recognizeGrid({
        provider: "ollama",
        imagePath: "puzzle.svg",
        env: {},
        fetchImpl: () => {
          fetched = true;
        },
      }),
      /Unsupported image type/,
    );
    assert.equal(fetched, false);
  });
});
