#!/usr/bin/env node
// 测试 ensure-base-skills.mjs（基础 skill 层 ensure，substrate 幂等）
// 运行: node --test assets/tests/scripts/ensure-base-skills.test.mjs
//
// 注意：fixture 内联的是「测试用精简清单（仅 demo 一项）」，与真实 base-skills.json 同构；
// 真实清单见 assets/templates/harness/base-skills.json。隔离掉真实 smart-advisor 便于聚焦断言。

import { test } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, "..", "..", "templates", "harness", "ensure-base-skills.mjs");

// fixture 清单（与真实 base-skills.json 的 name/source 语义一致）
const FIXTURE_MANIFEST = JSON.stringify({
  skills: [{ name: "demo", source: "base-skills/demo" }],
});
const FIXTURE_PAYLOAD = "# Demo Skill\n\nverbatim payload content.\n";

function makeProject({ withPayload = true, preinstall = false } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "ensure-"));
  mkdirSync(join(dir, ".harness", "base-skills", "demo"), { recursive: true });
  writeFileSync(join(dir, ".harness", "base-skills.json"), FIXTURE_MANIFEST);
  if (withPayload) {
    writeFileSync(join(dir, ".harness", "base-skills", "demo", "SKILL.md"), FIXTURE_PAYLOAD);
  }
  if (preinstall) {
    mkdirSync(join(dir, ".claude", "skills", "demo"), { recursive: true });
    writeFileSync(join(dir, ".claude", "skills", "demo", "SKILL.md"), "CUSTOM-USER-CONTENT");
  }
  return dir;
}

function run(projectDir) {
  try {
    const out = execFileSync("node", [SCRIPT, "--project", projectDir], { encoding: "utf8" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

test("缺失 → 复制到 .claude/skills/<name>/ 且退出 0", () => {
  const dir = makeProject();
  const r = run(dir);
  assert.equal(r.code, 0);
  const installed = join(dir, ".claude", "skills", "demo", "SKILL.md");
  assert.ok(existsSync(installed), "未复制到目标");
  assert.equal(readFileSync(installed, "utf8"), FIXTURE_PAYLOAD);
  rmSync(dir, { recursive: true, force: true });
});

test("在场 → 不碰（no-op），内容逐字节不变", () => {
  const dir = makeProject({ preinstall: true });
  const r = run(dir);
  assert.equal(r.code, 0);
  const installed = join(dir, ".claude", "skills", "demo", "SKILL.md");
  assert.equal(readFileSync(installed, "utf8"), "CUSTOM-USER-CONTENT", "覆盖了用户定制");
  rmSync(dir, { recursive: true, force: true });
});

test("幂等：连跑两次，第二次 skipped 且内容不变", () => {
  const dir = makeProject();
  run(dir);
  const r2 = run(dir);
  assert.equal(r2.code, 0);
  const last = r2.out.trim().split("\n").pop();
  const j = JSON.parse(last);
  assert.deepEqual(j.installed, []);
  assert.deepEqual(j.skipped, ["demo"]);
  rmSync(dir, { recursive: true, force: true });
});

test("payload 缺失 → 退出 0 + missing_payload 告警（不致命）", () => {
  const dir = makeProject({ withPayload: false });
  const r = run(dir);
  assert.equal(r.code, 0);
  const last = r.out.trim().split("\n").pop();
  const j = JSON.parse(last);
  assert.deepEqual(j.missing_payload, ["demo"]);
  rmSync(dir, { recursive: true, force: true });
});

test("清单缺失 → 退出 1（机械未就绪）", () => {
  const dir = mkdtempSync(join(tmpdir(), "nomani-"));
  const r = run(dir);
  assert.equal(r.code, 1);
  rmSync(dir, { recursive: true, force: true });
});

test("末行 JSON 摘要含 installed/skipped/missing_payload 数组", () => {
  const dir = makeProject();
  const r = run(dir);
  const last = r.out.trim().split("\n").pop();
  const j = JSON.parse(last);
  assert.ok(Array.isArray(j.installed));
  assert.ok(Array.isArray(j.skipped));
  assert.ok(Array.isArray(j.missing_payload));
  rmSync(dir, { recursive: true, force: true });
});
