#!/usr/bin/env node
// 测试 capability-field-map.json（能力→画像字段依赖图，preflight 权威源）
// 运行: node --test assets/tests/templates/capability-field-map.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");
const raw = readFileSync(
  join(TEMPLATES, "harness", "capability-field-map.json"),
  "utf8",
);
const map = JSON.parse(raw);

const KNOWN_FIELDS = new Set([
  "project_name", "overview", "tech_stack_intent", "app_type",
  "hard_constraints", "primary_language", "lint_config",
  "collab_mode", "tech_stack_detail",
]);

test("覆盖 P1–P8 全部能力", () => {
  for (const p of ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]) {
    assert.ok(map.capabilities[p], `缺能力: ${p}`);
    assert.ok(Array.isArray(map.capabilities[p].requires), `${p}.requires 须为数组`);
  }
});

test("requires 中每个字段都声明于 manifest 闭合字段集", () => {
  for (const [cap, spec] of Object.entries(map.capabilities)) {
    for (const f of spec.requires) {
      assert.ok(KNOWN_FIELDS.has(f), `${cap} 引用了未声明字段: ${f}`);
    }
  }
});

test("P5 依赖主语言/lint/硬约束（修复原『主语言无字段』断点）", () => {
  const r = new Set(map.capabilities.P5.requires);
  for (const f of ["primary_language", "lint_config", "hard_constraints"]) {
    assert.ok(r.has(f), `P5 缺依赖: ${f}`);
  }
});

test("P6 依赖协作模式；P7 依赖技术栈细化/应用类型/协作模式", () => {
  assert.ok(new Set(map.capabilities.P6.requires).has("collab_mode"));
  const p7 = new Set(map.capabilities.P7.requires);
  for (const f of ["tech_stack_detail", "app_type", "collab_mode"]) {
    assert.ok(p7.has(f), `P7 缺依赖: ${f}`);
  }
});
