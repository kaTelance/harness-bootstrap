#!/usr/bin/env node
// 测试 project-definition.md.tmpl（画像权威源）结构
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

test("模板存在且非空", () => {
  assert.ok(tmpl.length > 0);
});

test("frontmatter 含 project_name/mode/updated", () => {
  assert.match(tmpl, /project_name:\s*\{\{PROJECT_NAME\}\}/);
  assert.match(tmpl, /mode:\s*greenfield/);
  assert.match(tmpl, /updated:\s*\{\{DATE\}\}/);
});

test("首轮必答段含定位/技术栈意向/应用类型", () => {
  assert.match(tmpl, /定位:\s*\{\{OVERVIEW\}\}/);
  assert.match(tmpl, /技术栈意向:\s*\{\{TECH_STACK_INTENT\}\}/);
  assert.match(tmpl, /应用类型:\s*\{\{APP_TYPE\}\}/);
});

test("首轮选答段含硬约束（可空）", () => {
  assert.match(tmpl, /硬约束:\s*\{\{HARD_CONSTRAINTS\}\}/);
});

test("追问累积段含三个 <待…> 缺失标记", () => {
  assert.match(tmpl, /协作模式.*<待[^>]*P6/s);
  assert.match(tmpl, /lint[^]*<待[^>]*P5/s);
  assert.match(tmpl, /技术栈细化[^]*<待[^>]*P7/s);
});
