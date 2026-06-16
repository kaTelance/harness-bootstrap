#!/usr/bin/env node
// 测试 auto-check.mjs 的探测/跳过逻辑
// （仅测「跳过」路径，避免依赖真实编译环境导致测试不稳定）
// 运行: node --test assets/tests/hooks/auto-check.test.mjs

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
  "auto-check.mjs",
);

function runHook(input, env = {}) {
  // 清除 project_dir 类环境变量，避免宿主会话污染探测逻辑
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDE_PROJECT_DIR;
  delete cleanEnv.GEMINI_PROJECT_DIR;
  delete cleanEnv.QODERCN_PROJECT_DIR;
  delete cleanEnv.QODER_IDE;
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

// 用一个明确不存在的目录，确保 manifest 探测失败 → 跳过
const FAKE_DIR = "/__harness_bootstrap_not_exists__/";

test("非代码文件 (.md) 跳过 (exit 0, 无输出)", async () => {
  const { code, stdout } = await runHook({
    tool_input: { file_path: "/some/readme.md" },
    cwd: FAKE_DIR,
  });
  assert.equal(code, 0);
  assert.equal(stdout, "");
});

test(".rs 但无 Cargo.toml 跳过 (exit 0, 无输出)", async () => {
  const { code, stdout } = await runHook({
    tool_input: { file_path: "/some/main.rs" },
    cwd: FAKE_DIR,
  });
  assert.equal(code, 0);
  assert.equal(stdout, "");
});

test(".ts 但无 tsconfig.json 跳过 (exit 0, 无输出)", async () => {
  const { code, stdout } = await runHook({
    tool_input: { file_path: "/some/index.ts" },
    cwd: FAKE_DIR,
  });
  assert.equal(code, 0);
  assert.equal(stdout, "");
});

test(".go 但无 go.mod 跳过 (exit 0, 无输出)", async () => {
  const { code, stdout } = await runHook({
    tool_input: { file_path: "/some/main.go" },
    cwd: FAKE_DIR,
  });
  assert.equal(code, 0);
  assert.equal(stdout, "");
});

test("空 file_path 不崩溃 (exit 0)", async () => {
  const { code } = await runHook({ tool_input: {} });
  assert.equal(code, 0);
});
