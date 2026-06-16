#!/usr/bin/env node
// 测试 project-context.md.tmpl 标注画像来源 + 未定项
// 运行: node --test assets/tests/templates/project-context.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");
const tmpl = readFileSync(
  join(TEMPLATES, "harness", "L0", "project-context.md.tmpl"),
  "utf8",
);

test("声明画像来源为 project-definition.md", () => {
  assert.match(tmpl, /project-definition\.md/);
});

test("§1 概述保留 PROJECT_OVERVIEW 占位 + 标注从画像生成", () => {
  assert.match(tmpl, /\{\{PROJECT_OVERVIEW\}\}/);
});

test("标注未定项（待 scaffold / 追问后补）", () => {
  assert.match(tmpl, /待.*(scaffold|追问|补)/s);
});
