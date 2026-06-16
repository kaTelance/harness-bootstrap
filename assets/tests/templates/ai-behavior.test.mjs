#!/usr/bin/env node
// 测试 ai-behavior.md.tmpl L0 自包含性
// 运行: node --test assets/tests/templates/ai-behavior.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");
const tmpl = readFileSync(
  join(TEMPLATES, "harness", "L0", "ai-behavior.md.tmpl"),
  "utf8",
);

test("§2 内联闸门速查含 G1→G7 主链", () => {
  assert.match(tmpl, /G1[^]*G2[^]*G3[^]*G4[^]*G5[^]*G7/s);
});

test("§2 内联速查覆盖 G8-G12", () => {
  for (const g of ["G8", "G9", "G10", "G11", "G12"]) {
    assert.ok(tmpl.includes(g), `应包含 ${g}`);
  }
});

test("gates/index.md 引用标注 P3 生成 + 未生成降级", () => {
  assert.match(tmpl, /gates\/index\.md/);
  assert.match(tmpl, /P3\s*生成/s);
  assert.match(tmpl, /未生成/s);
});

test("code-impact-review.md 引用标注 P5 生成", () => {
  assert.match(tmpl, /code-impact-review\.md/);
  assert.match(tmpl, /P5\s*生成/s);
});

test("auto-commit-workflow.md 引用标注 P6 生成", () => {
  assert.match(tmpl, /auto-commit-workflow\.md/);
  assert.match(tmpl, /P6\s*生成/s);
});

test("无悬空必需引用：顶部声明规则文件为可选增强", () => {
  assert.match(tmpl, /P3\s*生成/s);
  assert.match(tmpl, /P5.*P6|P6.*P5/s);
});
