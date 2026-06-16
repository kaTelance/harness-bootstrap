#!/usr/bin/env node
// 校验 settings.json.tmpl 的 hooks 配置是否符合 Claude Code schema。
// 运行: node --test assets/tests/hooks/settings-schema.test.mjs
//
// Claude Code hooks schema 要点（见 https://code.claude.com/docs/en/hooks）:
//   - hook.command 是单个 shell 命令字符串（不支持 args 数组）
//   - 超时字段是 timeoutMs（毫秒），不是 timeout（秒）
//   - matcher 匹配工具名（Write|Edit|MultiEdit|Bash 等）
//   - exit 0 放行；exit 2 阻断并把 stderr 反馈给 Claude

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmplPath = join(__dirname, "..", "..", "templates", "claude", "settings.json.tmpl");

// settings.json.tmpl 当前不含 {{VAR}}，可直接 JSON.parse。
// 若未来引入变量替换，这里会显式失败，提醒维护者同步更新本测试。
function loadSettings() {
  const raw = readFileSync(tmplPath, "utf8");
  if (raw.includes("{{")) {
    throw new Error("settings.json.tmpl 含未替换的 {{VAR}} 占位符，无法直接校验");
  }
  return JSON.parse(raw);
}

function allHookCommands(settings) {
  const out = [];
  for (const handlers of Object.values(settings.hooks || {})) {
    for (const rule of handlers) {
      for (const h of rule.hooks || []) {
        out.push({ matcher: rule.matcher, hook: h });
      }
    }
  }
  return out;
}

test("settings.json.tmpl 可被 JSON.parse", () => {
  const s = loadSettings();
  assert.ok(s.hooks, "缺少 hooks 顶层键");
});

test("每个 hook 用 command 字符串，不用 args 数组", () => {
  const cmds = allHookCommands(loadSettings());
  assert.ok(cmds.length > 0, "未找到任何 hook");
  for (const { hook } of cmds) {
    assert.equal(hook.type, "command");
    assert.equal(typeof hook.command, "string", "command 必须是字符串");
    assert.ok(hook.command.length > 0, "command 不能为空");
    assert.equal(hook.args, undefined, "args 不被 Claude Code 支持，应合并进 command 字符串");
  }
});

test("超时字段是 timeoutMs（毫秒），不是 timeout（秒）", () => {
  const cmds = allHookCommands(loadSettings());
  for (const { hook } of cmds) {
    assert.equal(hook.timeout, undefined, "timeout（秒）不是合法字段，改用 timeoutMs（毫秒）");
    if (hook.timeoutMs !== undefined) {
      assert.equal(typeof hook.timeoutMs, "number");
      assert.ok(hook.timeoutMs > 0);
    }
  }
});

test("command 都通过 node 调用 .harness/hooks 下的脚本", () => {
  const cmds = allHookCommands(loadSettings());
  for (const { hook } of cmds) {
    assert.match(
      hook.command,
      /node .*\.harness\/hooks\/.+\.mjs/,
      `command 不符合预期: ${hook.command}`,
    );
  }
});

test("关键事件与 matcher 覆盖齐全", () => {
  const s = loadSettings();
  assert.ok(s.hooks.SessionStart, "缺少 SessionStart");
  assert.ok(s.hooks.PreToolUse, "缺少 PreToolUse");
  assert.ok(s.hooks.PostToolUse, "缺少 PostToolUse");

  // 写操作必须覆盖 MultiEdit，否则 MultiEdit 编辑不触发 hook
  const writeMatchers = s.hooks.PreToolUse.map((r) => r.matcher).join("|");
  for (const t of ["Write", "Edit", "MultiEdit"]) {
    assert.ok(writeMatchers.includes(t), `PreToolUse matcher 未覆盖 ${t}`);
  }
});
