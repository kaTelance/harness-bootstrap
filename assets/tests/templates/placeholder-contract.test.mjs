#!/usr/bin/env node
// 跨模板占位符契约：每个 {{VAR}} 必须声明于画像 manifest，或是已知的非画像生成变量
// 运行: node --test assets/tests/templates/placeholder-contract.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// 非画像来源的生成期变量：结构型（DATE/MODE/PROFILE_DATE）+ P7 领域专家生成型（DOMAIN_*）
// 注：DOMAIN_* 来自 _domain-expert.md.tmpl 的独立变量源，本契约暂 allowlist。
const KNOWN_NON_PROFILE = new Set([
  "DATE", "MODE", "PROFILE_DATE",
  "DOMAIN", "DOMAIN_TITLE", "DOMAIN_SLUG", "DOMAIN_TRIGGERS",
]);

// 从 manifest 表格行提取合法字段名（大写）
const manifest = readFileSync(
  join(ROOT, "templates", "harness", "project-definition.md.tmpl"),
  "utf8",
);
const DECLARED = new Set(
  [...manifest.matchAll(/^\|\s*([a-z_][a-z0-9_]*)\s*\|/gim)].map((m) => m[1].toUpperCase()),
);

const TMPL_DIR = join(ROOT, "templates");
function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".tmpl")) yield p;
  }
}

const used = new Map(); // VAR -> Set(files)
function collect(file, rel) {
  const txt = readFileSync(file, "utf8");
  for (const m of txt.matchAll(/\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g)) {
    const v = m[1];
    if (!used.has(v)) used.set(v, new Set());
    used.get(v).add(rel);
  }
}
for (const f of walk(TMPL_DIR)) collect(f, relative(ROOT, f));
collect(join(ROOT, "progress-schema.md"), "progress-schema.md"); // O2: 非 .tmpl 也扫

test("每个 {{VAR}} 都声明于 manifest 或属于已知非画像变量", () => {
  const undeclared = [...used.keys()].filter(
    (v) => !DECLARED.has(v) && !KNOWN_NON_PROFILE.has(v),
  );
  const detail = undeclared.map((v) => `${v} @ ${[...used.get(v)].join(",")}`).join("; ");
  assert.deepEqual(undeclared, [], `未声明占位符（须改用 manifest 字段名或加入 KNOWN_NON_PROFILE）: ${detail}`);
});

test("OVERVIEW 在 project-context.md.tmpl 中使用（非 PROJECT_OVERVIEW）", () => {
  const pc = readFileSync(join(TMPL_DIR, "harness", "L0", "project-context.md.tmpl"), "utf8");
  assert.ok(!/\{\{\s*PROJECT_OVERVIEW\s*\}\}/.test(pc), "仍残留 {{PROJECT_OVERVIEW}}");
  assert.match(pc, /\{\{\s*OVERVIEW\s*\}\}/);
});
