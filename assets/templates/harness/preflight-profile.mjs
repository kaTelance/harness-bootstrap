#!/usr/bin/env node
// .harness/preflight-profile.mjs
// Step 0.5 画像装配的机械执行体：校验目标能力的依赖字段是否已决。
// SKILL.md 在 Step 0.5 主动调用（不是 CC hook；作用域限定在搭建流程）。
//
// 用法: node .harness/preflight-profile.mjs <P{n}|all> [--project <dir>]
// 退出码: 0 = 全部依赖字段已决（可进入 Step 1）; 1 = 有 <待…> 未决（须先追问回写）
// 输出: 人类可读 + 末行 JSON 摘要 { ready, checked|missing }

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// 解析 --project 与目标能力
const argv = process.argv.slice(2);
const projectIdx = argv.indexOf("--project");
const projectDir = resolve(
  projectIdx >= 0 ? argv[projectIdx + 1] : process.env.CLAUDE_PROJECT_DIR || process.cwd(),
);
const target = argv.find((a) => /^(P[1-8]|all)$/i.test(a))?.toUpperCase();

const profilePath = `${projectDir}/.harness/project-definition.md`;
const mapPath = `${projectDir}/.harness/capability-field-map.json`;

// 容错：画像不存在 → 视为首次，放行（P1 无追问依赖）
if (!existsSync(profilePath)) {
  console.error(`[preflight] project-definition.md 不存在: ${profilePath}`);
  console.error("→ 视为首次调用，走 §首次判定搭 P1，不在此校验。");
  process.exit(0);
}
if (!existsSync(mapPath)) {
  console.error(`[preflight] capability-field-map.json 不存在: ${mapPath}`);
  console.error("→ 依赖图缺失，无法机械校验。请重新生成 P1（含 map）。");
  process.exit(1);
}

const profile = readFileSync(profilePath, "utf8");
const map = JSON.parse(readFileSync(mapPath, "utf8"));

// 解析画像字段值：抓表格行 "| key | value |"
function parseFields(md) {
  const fields = {};
  for (const line of md.split("\n")) {
    const m = line.match(/^\|\s*([a-z_][a-z0-9_]*)\s*\|\s*(.*?)\s*\|/i);
    if (m) fields[m[1].toLowerCase()] = m[2].trim();
  }
  return fields;
}

// 未决判定：<待…> 或缺失/空 = 未决；其余（含「无」/N/A）= 已决
function isUnresolved(v) {
  return v == null || v === "" || /<待/.test(v);
}

const fields = parseFields(profile);
const caps = target === "ALL" ? Object.keys(map.capabilities) : target ? [target] : [];
if (caps.length === 0) {
  console.error("[preflight] 用法: node .harness/preflight-profile.mjs <P{n}|all> [--project <dir>]");
  process.exit(1);
}

const missing = [];
for (const cap of caps) {
  const req = map.capabilities[cap]?.requires || [];
  for (const f of req) {
    const cur = fields[f.toLowerCase()];
    if (isUnresolved(cur)) {
      missing.push({ capability: cap, field: f, current: cur ?? "(未找到)" });
    }
  }
}

if (missing.length === 0) {
  console.log(`[preflight] OK: ${caps.join(", ")} 依赖字段均已决，可进入 Step 1。`);
  console.log(JSON.stringify({ ready: true, checked: caps }));
  process.exit(0);
} else {
  console.log(`[preflight] BLOCK: 以下依赖字段未决，须先追问回写 .harness/project-definition.md：`);
  for (const m of missing) console.log(`  - ${m.capability} ← ${m.field} (当前: ${m.current})`);
  console.log(JSON.stringify({ ready: false, missing }));
  process.exit(1);
}
