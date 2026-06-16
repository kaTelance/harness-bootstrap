#!/usr/bin/env node
// 测试 session-gate-reminder.mjs（含跳序降级）
// 运行: node --test assets/tests/hooks/session-gate-reminder.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const hookPath = join(
  __dirname,
  "..",
  "..",
  "templates",
  "harness",
  "hooks",
  "session-gate-reminder.mjs",
);

function runHook(input, env = {}) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.GEMINI_PROJECT_DIR;
  delete cleanEnv.QODER_IDE;
  delete cleanEnv.CLAUDE_PROJECT_DIR;
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [hookPath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: { ...cleanEnv, ...env },
    });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.on("close", (code) => resolve({ code, stdout }));
    child.stdin.end(JSON.stringify(input));
  });
}

function freshDir() {
  return mkdtempSync(join(tmpdir(), "harness-sess-")).replace(/\\/g, "/");
}

test("gates 未搭建时降级提示（不注入悬空路径）", async () => {
  const dir = freshDir();
  const { code, stdout } = await runHook({}, { CLAUDE_PROJECT_DIR: dir });
  assert.equal(code, 0);
  const out = JSON.parse(stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /尚未搭建/);
  // 降级分支不应列出 G1..G12 的具体文件路径
  assert.doesNotMatch(out.hookSpecificOutput.additionalContext, /G12-hook-feedback-loop\.md/);
});

test("gates 已搭建时输出完整闸门表", async () => {
  const nativeDir = mkdtempSync(join(tmpdir(), "harness-sess-"));
  const gatesDir = join(nativeDir, ".harness", "gates");
  mkdirSync(gatesDir, { recursive: true });
  writeFileSync(join(gatesDir, "index.md"), "# gates");
  const dir = nativeDir.replace(/\\/g, "/");
  const { code, stdout } = await runHook({}, { CLAUDE_PROJECT_DIR: dir });
  assert.equal(code, 0);
  const out = JSON.parse(stdout);
  assert.match(out.hookSpecificOutput.additionalContext, /G12 Hook 反馈闭环/);
});
