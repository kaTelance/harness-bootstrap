#!/usr/bin/env node
// 测试 project-definition.md.tmpl（画像权威源）闭合 manifest 结构
// 运行: node --test assets/tests/templates/project-definition.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");
const tmpl = readFileSync(
  join(TEMPLATES, "harness", "project-definition.md.tmpl"),
  "utf8",
);

test("frontmatter 含 project_name / mode / updated（mode 占位符化）", () => {
  assert.match(tmpl, /project_name:\s*\{\{PROJECT_NAME\}\}/);
  assert.match(tmpl, /mode:\s*\{\{MODE\}\}/);
  assert.match(tmpl, /updated:\s*\{\{DATE\}\}/);
});

const REQUIRED_FIELDS = [
  "project_name", "overview", "tech_stack_intent", "app_type",
  "hard_constraints", "primary_language", "lint_config",
  "collab_mode", "tech_stack_detail",
];

test("字段清单表格含全部闭合字段（每项一行 `| key | value |`）", () => {
  for (const f of REQUIRED_FIELDS) {
    assert.match(tmpl, new RegExp(`\\|\\s*${f}\\s*\\|`), `缺字段行: ${f}`);
  }
});

test("首轮字段用 {{VAR}} 占位符（生成期替换）", () => {
  assert.match(tmpl, /\|\s*project_name\s*\|\s*\{\{PROJECT_NAME\}\}\s*\|/);
  assert.match(tmpl, /\|\s*overview\s*\|\s*\{\{OVERVIEW\}\}\s*\|/);
  assert.match(tmpl, /\|\s*tech_stack_intent\s*\|\s*\{\{TECH_STACK_INTENT\}\}\s*\|/);
  assert.match(tmpl, /\|\s*app_type\s*\|\s*\{\{APP_TYPE\}\}\s*\|/);
  assert.match(tmpl, /\|\s*hard_constraints\s*\|\s*\{\{HARD_CONSTRAINTS\}\}\s*\|/);
});

test("追问字段用 <待…> 缺失哨兵", () => {
  assert.match(tmpl, /\|\s*primary_language\s*\|[^|]*<待[^>]*P5/i);
  assert.match(tmpl, /\|\s*lint_config\s*\|[^|]*<待[^>]*P5/i);
  assert.match(tmpl, /\|\s*collab_mode\s*\|[^|]*<待[^>]*P6/i);
  assert.match(tmpl, /\|\s*tech_stack_detail\s*\|[^|]*<待[^>]*P7/i);
});

test("声明状态语义：<待…> = 未决，其余（含「无」/N/A）= 已决", () => {
  assert.match(tmpl, /状态语义|未决|preflight/i);
});

test("指向依赖图权威源 capability-field-map.json", () => {
  assert.match(tmpl, /capability-field-map\.json/);
});
