#!/usr/bin/env node
// 测试 protect-harness-files.mjs
// 运行: node --test assets/tests/hooks/protect-harness-files.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
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
  "protect-harness-files.mjs",
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
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}

function freshDir() {
  return mkdtempSync(join(tmpdir(), "harness-prot-")).replace(/\\/g, "/");
}

test("编辑 .harness/ 文件输出 Claude 提醒 JSON", async () => {
  const dir = freshDir();
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${dir}/.harness/gates/G1.md` } },
    { CLAUDE_PROJECT_DIR: dir },
  );
  assert.equal(code, 0);
  const out = JSON.parse(stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.match(out.hookSpecificOutput.additionalContext, /G6\/G11 提醒/);
});

test("编辑 CLAUDE.md 输出提醒", async () => {
  const dir = freshDir();
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${dir}/CLAUDE.md` } },
    { CLAUDE_PROJECT_DIR: dir },
  );
  assert.equal(code, 0);
  assert.match(JSON.parse(stdout).hookSpecificOutput.additionalContext, /治理文件/);
});

test("编辑 .claude/ 文件输出提醒（治理配置）", async () => {
  const dir = freshDir();
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${dir}/.claude/agents/expert.md` } },
    { CLAUDE_PROJECT_DIR: dir },
  );
  assert.equal(code, 0);
  assert.ok(stdout.length > 0, "应输出治理文件提醒");
});

test("编辑普通源码文件无输出", async () => {
  const dir = freshDir();
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${dir}/src/app.ts` } },
    { CLAUDE_PROJECT_DIR: dir },
  );
  assert.equal(code, 0);
  assert.equal(stdout, "");
});
