#!/usr/bin/env node
// 测试 auto-format.mjs 的短路逻辑（治理文件 / 不存在文件跳过）
// 仅测短路路径，避免依赖真实 prettier 环境。
// 运行: node --test assets/tests/hooks/auto-format.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const hookPath = join(__dirname, "..", "..", "templates", "harness", "hooks", "auto-format.mjs");

function runHook(input) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.GEMINI_PROJECT_DIR; // 避免宿主 Gemini 环境干扰输出分支
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [hookPath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: cleanEnv,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}

// 创建真实文件（existsSync 检查需要），返回正斜杠路径喂给 hook
function makeFile(rel) {
  const dir = mkdtempSync(join(tmpdir(), "harness-fmt-"));
  const nativeFull = join(dir, ...rel.split("/"));
  const parent = nativeFull.slice(0, nativeFull.lastIndexOf(sep));
  mkdirSync(parent, { recursive: true });
  writeFileSync(nativeFull, "placeholder\n");
  return nativeFull.replace(/\\/g, "/");
}

test(".harness/ 下文件跳过格式化 (exit 0)", async () => {
  const full = makeFile(".harness/gates/G1.md");
  const { code } = await runHook({ tool_input: { file_path: full } });
  assert.equal(code, 0);
});

test(".claude/ 下文件跳过格式化 (exit 0)", async () => {
  const full = makeFile(".claude/agents/expert.md");
  const { code } = await runHook({ tool_input: { file_path: full } });
  assert.equal(code, 0);
});

test("CLAUDE.md 跳过格式化 (exit 0)", async () => {
  const full = makeFile("CLAUDE.md");
  const { code } = await runHook({ tool_input: { file_path: full } });
  assert.equal(code, 0);
});

test("AGENTS.md 跳过格式化 (exit 0)", async () => {
  const full = makeFile("AGENTS.md");
  const { code } = await runHook({ tool_input: { file_path: full } });
  assert.equal(code, 0);
});

test("不存在的文件跳过 (exit 0)", async () => {
  const { code } = await runHook({ tool_input: { file_path: "/no/such/file.ts" } });
  assert.equal(code, 0);
});
