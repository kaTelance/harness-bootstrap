#!/usr/bin/env node
// 测试 SKILL.md：首轮问答 / 增量追问 / 映射表 / 判定兜底 / Step 4 硬规则 + Step 0.5 preflight 闭合 loop
// 运行: node --test assets/tests/templates/skill-md.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const tmpl = readFileSync(join(ROOT, "SKILL.md"), "utf8");

// ---- 既有断言（保留）----

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

// ---- 新增断言（Step 0.5 闭合 loop）----

test("执行流程含 Step 0.5 画像装配 preflight", () => {
  assert.match(tmpl, /Step 0\.5/);
  assert.match(tmpl, /preflight-profile\.mjs/);
});

test("Step 0.5 语义：退出码 0 放行 / 1 阻塞回写", () => {
  assert.match(tmpl, /退出码\s*0/);
  assert.match(tmpl, /退出码\s*1|BLOCK/);
});

test("连续模式 all 接入 preflight（每轮跑）", () => {
  assert.match(tmpl, /连续模式[\s\S]{0,40}preflight|preflight[\s\S]{0,40}连续模式|all[\s\S]{0,20}每轮/);
});

test("增量追问折叠为指针（权威源 capability-field-map.json）", () => {
  assert.match(tmpl, /capability-field-map\.json/);
});

test("P1 产物含 preflight + map 并声明复制", () => {
  assert.match(tmpl, /preflight-profile\.mjs/);
  assert.match(tmpl, /capability-field-map\.json/);
  assert.match(tmpl, /原样复制|复制到\s*`?\.harness/);
});

test("含边界与失败模式小节", () => {
  assert.match(tmpl, /##.*边界与失败模式/);
});

// ---- 新增断言（smart-advisor 基础 skill 层）----

test("Step 0 前置：基础 skill 层确保（substrate）", () => {
  assert.match(tmpl, /Step 0 前置/);
  assert.match(tmpl, /ensure-base-skills\.mjs/);
  assert.match(tmpl, /substrate/);
});

test("三态逻辑：fresh 首调跳过 / 老项目机械缺失提示补全", () => {
  assert.match(tmpl, /fresh 首调|静默跳过/);
  assert.match(tmpl, /基础层机械缺失|幂等补全/);
});

test("P1 产物含 base-skills 机械（清单+脚本+payload）", () => {
  assert.match(tmpl, /base-skills\.json/);
  assert.match(tmpl, /ensure-base-skills\.mjs/);
  assert.match(tmpl, /base-skills\/smart-advisor/);
});

test("P1 末尾跑 ensure 首装（首搭即落 .claude/skills/）", () => {
  assert.match(tmpl, /复制完成后跑|P1 末尾跑/);
  assert.match(tmpl, /\.claude\/skills\/smart-advisor/);
});

test("边界表含基础 skill 三场景（已存在/机械缺失/payload 缺失）", () => {
  assert.match(tmpl, /已存在[\s\S]{0,60}跳过/);
  assert.match(tmpl, /payload 缺失|基础层机械缺失/);
});
