#!/usr/bin/env node
// 测试 plan-to-apply-checkpoint.mjs
// 运行: node --test assets/tests/hooks/plan-to-apply-checkpoint.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { spawn } from "node:child_process";
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
  "plan-to-apply-checkpoint.mjs",
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

const PROJ = "/proj";

test("Edit 代码文件触发 G3 检查站", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${PROJ}/src/app.ts` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.match(JSON.parse(stdout).hookSpecificOutput.additionalContext, /G3 Plan-to-Apply/);
});

test("Write 代码文件触发 G3 检查站", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Write", tool_input: { file_path: `${PROJ}/src/new.rs` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.ok(stdout.length > 0, "应输出提醒");
});

test("编辑 .md 文件不触发", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${PROJ}/README.md` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.equal(stdout, "");
});

test("编辑 .json 配置不触发", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${PROJ}/package.json` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.equal(stdout, "");
});
