#!/usr/bin/env node
// 测试 SKILL.md 含首轮问答 / 增量追问 / 映射表 / 判定兜底 / Step 4 硬规则
// 运行: node --test assets/tests/templates/skill-md.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const tmpl = readFileSync(join(ROOT, "SKILL.md"), "utf8");

test("greenfield 首次分支引用首轮问答 + project-definition.md", () => {
  assert.match(tmpl, /首轮问答/s);
  assert.match(tmpl, /project-definition\.md/);
});

test("首轮问答列 5 项（项目名/定位/技术栈意向/应用类型/硬约束）", () => {
  assert.match(tmpl, /项目名/);
  assert.match(tmpl, /一句话定位/);
  assert.match(tmpl, /技术栈意向/);
  assert.match(tmpl, /应用类型/);
  assert.match(tmpl, /硬约束/);
});

test("首轮不用 AskUserQuestion（标注开放文本/上限）", () => {
  assert.match(tmpl, /不用 AskUserQuestion|不用\s*`?AskUserQuestion/);
});

test("含增量追问小节 + 能力映射表（P5/P6/P7 追问）", () => {
  assert.match(tmpl, /增量追问/s);
  assert.match(tmpl, /协作模式/);
  assert.match(tmpl, /P5[^]*P6[^]*P7/s);
});

test("判定兜底：双否 → greenfield", () => {
  assert.match(tmpl, /判定兜底/s);
  assert.match(tmpl, /greenfield/s);
});

test("Step 4 含 L0 条件引用硬规则", () => {
  assert.match(tmpl, /条件引用/s);
  assert.match(tmpl, /L0/);
  assert.match(tmpl, /自包含/s);
});
