#!/usr/bin/env node
// 测试 progress-schema.md 画像段改为指针
// 运行: node --test assets/tests/templates/progress-schema.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpl = readFileSync(
  join(__dirname, "..", "..", "progress-schema.md"),
  "utf8",
);

test("画像段引用 project-definition.md 作为权威源", () => {
  assert.match(tmpl, /project-definition\.md/);
});

test("不再内联 {{PROJECT_PROFILE}} 占位符", () => {
  assert.doesNotMatch(tmpl, /\{\{PROJECT_PROFILE\}\}/);
});

test("per-[x] 行含构建溯源（画像版本 + 依赖字段）", () => {
  assert.match(tmpl, /画像v|PROFILE_DATE/i);
  assert.match(tmpl, /字段:\s*\[/);
});

test("声明画像变更触发重校验", () => {
  assert.match(tmpl, /重校验|stale/s);
});

test("声明 project-definition.md 损坏的容错策略（不臆测）", () => {
  assert.match(tmpl, /画像容错/);
  assert.match(tmpl, /不臆测/);
});
