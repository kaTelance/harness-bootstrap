#!/usr/bin/env node
// 测试 preflight-profile.mjs（Step 0.5 画像装配机械校验）
// 运行: node --test assets/tests/scripts/preflight-profile.test.mjs
//
// 注意：fixture 内联的是「测试用精简 map（仅 P1/P5）」，与真实 capability-field-map.json 不同；
// 真实依赖图见 assets/templates/harness/capability-field-map.json。隔离掉无关能力便于聚焦断言。

import { test } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, "..", "..", "templates", "harness", "preflight-profile.mjs");

const FIXTURE_MAP = JSON.stringify({
  capabilities: {
    P1: { requires: [] },
    P5: { requires: ["primary_language", "lint_config", "hard_constraints"] },
  },
});

function makeProject(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "preflight-"));
  mkdirSync(join(dir, ".harness"), { recursive: true });
  const base = {
    project_name: "demo", overview: "o", tech_stack_intent: "Node",
    app_type: "CLI", hard_constraints: "无",
    primary_language: "<待 P5 前追问>", lint_config: "<待 P5 前追问>",
    collab_mode: "<待 P6 前追问>", tech_stack_detail: "<待 P7 前追问>",
    ...overrides,
  };
  const lines = ["# x", "", "| 字段 | 值 | 来源 | 喂养的能力 |", "|---|---|---|---|"];
  for (const [k, v] of Object.entries(base)) lines.push(`| ${k} | ${v} | s | c |`);
  writeFileSync(join(dir, ".harness", "project-definition.md"), lines.join("\n") + "\n");
  writeFileSync(join(dir, ".harness", "capability-field-map.json"), FIXTURE_MAP);
  return dir;
}

function run(projectDir, cap) {
  try {
    const out = execFileSync("node", [SCRIPT, cap, "--project", projectDir], {
      encoding: "utf8",
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

test("P5 依赖字段未决 → 退出码 1 且列出缺失", () => {
  const dir = makeProject();
  const r = run(dir, "P5");
  assert.equal(r.code, 1);
  assert.match(r.out, /primary_language/);
  assert.match(r.out, /lint_config/);
  rmSync(dir, { recursive: true, force: true });
});

test("P5 依赖字段已决 → 退出码 0", () => {
  const dir = makeProject({ primary_language: "TypeScript", lint_config: "eslint+prettier" });
  assert.equal(run(dir, "P5").code, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("hard_constraints=「无」视为已决（不误报）", () => {
  const dir = makeProject({ primary_language: "TS", lint_config: "eslint", hard_constraints: "无" });
  assert.equal(run(dir, "P5").code, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("末行输出 JSON 摘要供 SKILL 解析", () => {
  const dir = makeProject();
  const r = run(dir, "P5");
  const last = r.out.trim().split("\n").pop();
  const j = JSON.parse(last);
  assert.equal(j.ready, false);
  assert.ok(j.missing.length >= 2);
  rmSync(dir, { recursive: true, force: true });
});

test("project-definition.md 不存在 → 放行（首次搭 P1）", () => {
  const dir = mkdtempSync(join(tmpdir(), "empty-"));
  assert.equal(run(dir, "P1").code, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("P1 无依赖 → 已决", () => {
  const dir = makeProject();
  assert.equal(run(dir, "P1").code, 0);
  rmSync(dir, { recursive: true, force: true });
});
