#!/usr/bin/env node
// 测试 base-skills.json（基础 skill 清单）+ vendor payload 完整性
// 运行: node --test assets/tests/templates/base-skills.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..", "..");
const HARNESS = join(ROOT, "assets", "templates", "harness");

const manifest = JSON.parse(
  readFileSync(join(HARNESS, "base-skills.json"), "utf8"),
);

test("清单含 smart-advisor 一项，source 指向 base-skills/smart-advisor", () => {
  assert.ok(Array.isArray(manifest.skills), "skills 须为数组");
  const sa = manifest.skills.find((s) => s.name === "smart-advisor");
  assert.ok(sa, "清单缺 smart-advisor");
  assert.equal(sa.source, "base-skills/smart-advisor");
});

test("清单声明的每个 skill 的 payload 目录存在", () => {
  for (const s of manifest.skills) {
    assert.ok(existsSync(join(HARNESS, s.source)), `payload 目录缺失: ${s.source}`);
  }
});

test("smart-advisor payload 含 SKILL.md + examples.md，且 frontmatter name 匹配", () => {
  const dir = join(HARNESS, "base-skills", "smart-advisor");
  const skillMd = readFileSync(join(dir, "SKILL.md"), "utf8");
  assert.ok(existsSync(join(dir, "examples.md")), "缺 examples.md");
  assert.match(skillMd, /^name:\s*smart-advisor/m, "SKILL.md frontmatter name 须为 smart-advisor");
});
