#!/usr/bin/env node
// 测试 impact-assess-guard.mjs（收紧后的共享模块启发式）
// 运行: node --test assets/tests/hooks/impact-assess-guard.test.mjs

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
  "impact-assess-guard.mjs",
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

test("修改 monorepo 包入口触发 G4 提醒", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${PROJ}/packages/ui/src/index.ts` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.match(JSON.parse(stdout).hookSpecificOutput.additionalContext, /G4 影响评估/);
});

test("修改 src/lib/index.ts 触发 G4 提醒", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${PROJ}/src/lib/index.ts` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.ok(stdout.length > 0, "应输出提醒");
});

test("修改 src/utils/helper.ts 不触发（收紧后排除常见目录）", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${PROJ}/src/utils/helper.ts` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.equal(stdout, "");
});

test("修改普通业务文件不触发", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Edit", tool_input: { file_path: `${PROJ}/src/features/auth/login.ts` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.equal(stdout, "");
});

test("Write 工具不触发（仅 Edit/replace）", async () => {
  const { code, stdout } = await runHook(
    { tool_name: "Write", tool_input: { file_path: `${PROJ}/packages/ui/src/index.ts` } },
    { CLAUDE_PROJECT_DIR: PROJ },
  );
  assert.equal(code, 0);
  assert.equal(stdout, "");
});
