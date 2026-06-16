#!/usr/bin/env node
// e2e 契约测试：用「真实 project-definition.md.tmpl 替换占位符后生成的画像」喂给 preflight，
// 锁定「模板表格格式 ↔ preflight 解析正则」契约——任一方改格式（加列/换分隔/改键名）会在此断裂。
// 运行: node --test assets/tests/scripts/preflight-template-contract.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const TMPL_DIR = join(here, "..", "..", "templates", "harness");
const SCRIPT = join(TMPL_DIR, "preflight-profile.mjs");
const REAL_MAP = readFileSync(join(TMPL_DIR, "capability-field-map.json"), "utf8");
const tmpl = readFileSync(join(TMPL_DIR, "project-definition.md.tmpl"), "utf8");

// 首轮 {{VAR}} 替换为实例值；追问字段 <待…> 保持字面量（未决）
const VALS = {
  PROJECT_NAME: "DemoProj", MODE: "greenfield", DATE: "2026-06-17",
  OVERVIEW: "A demo CLI", TECH_STACK_INTENT: "Node", APP_TYPE: "CLI",
  HARD_CONSTRAINTS: "无",
};
const instance = tmpl.replace(/\{\{(\w+)\}\}/g, (_, k) => VALS[k] ?? `{{${k}}}`);

function makeProject(md) {
  const dir = mkdtempSync(join(tmpdir(), "preflight-e2e-"));
  mkdirSync(join(dir, ".harness"), { recursive: true });
  writeFileSync(join(dir, ".harness", "project-definition.md"), md);
  writeFileSync(join(dir, ".harness", "capability-field-map.json"), REAL_MAP);
  return dir;
}
function run(dir, cap) {
  try {
    return { code: 0, out: execFileSync("node", [SCRIPT, cap, "--project", dir], { encoding: "utf8" }) };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

test("真实模板生成画像：P5 追问未决 → preflight 退出码 1 且报 primary_language/lint_config", () => {
  const dir = makeProject(instance);
  const r = run(dir, "P5");
  assert.equal(r.code, 1, `期望 block，实得:\n${r.out}`);
  assert.match(r.out, /primary_language/);
  assert.match(r.out, /lint_config/);
  rmSync(dir, { recursive: true, force: true });
});

test("真实模板 + <待 P5 前追问> 已回填 → P5 preflight 退出码 0", () => {
  const filled = instance.replace(/<待 P5 前追问>/g, "resolved");
  const dir = makeProject(filled);
  const r = run(dir, "P5");
  assert.equal(r.code, 0, `期望 ready，实得:\n${r.out}`);
  rmSync(dir, { recursive: true, force: true });
});

test("真实模板：P3 仅依赖 app_type（首轮已填）→ 退出码 0（证明首轮字段被正确解析为已决）", () => {
  const dir = makeProject(instance);
  const r = run(dir, "P3");
  assert.equal(r.code, 0, `期望 ready，实得:\n${r.out}`);
  rmSync(dir, { recursive: true, force: true });
});
