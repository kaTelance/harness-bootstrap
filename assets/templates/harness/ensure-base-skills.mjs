#!/usr/bin/env node
// .harness/ensure-base-skills.mjs
// 基础 skill 层确保（substrate）：遍历 <projectDir>/.harness/base-skills.json，
// 把每个 skill 从 <projectDir>/.harness/<source>/ 复制到 <projectDir>/.claude/skills/<name>/。
// 幂等：目标在场即跳过（不碰定制/旧版）。
//
// SKILL.md 在 Step 0 前置 / P1 末尾主动调用（不是 CC hook；作用域限定在搭建流程）。
// 路径解析对齐 preflight-profile.mjs：读 projectDir/.harness/，便于 fixture 测试 + shipped 后指向同级。
//
// 用法: node .harness/ensure-base-skills.mjs [--project <dir>]
// 退出码: 0 = 已处理（含单 payload 缺失的降级告警）；1 = 清单 base-skills.json 缺失（机械未就绪）
// 输出: 人类可读 + 末行 JSON 摘要 { installed, skipped, missing_payload }

import { readFileSync, existsSync, cpSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";

// 解析 --project
const argv = process.argv.slice(2);
const projectIdx = argv.indexOf("--project");
const projectDir = resolve(
  projectIdx >= 0 ? argv[projectIdx + 1] : process.env.CLAUDE_PROJECT_DIR || process.cwd(),
);

const harnessDir = join(projectDir, ".harness");
const manifestPath = join(harnessDir, "base-skills.json");
const skillsDir = join(projectDir, ".claude", "skills");

if (!existsSync(manifestPath)) {
  console.error(`[ensure-base-skills] 清单缺失: ${manifestPath}`);
  console.error("→ 基础层机械未就绪，请重跑 /harness-bootstrap P1 幂等补全（补清单+脚本+payload）。");
  console.log(JSON.stringify({ installed: [], skipped: [], missing_payload: [], error: "manifest_missing" }));
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const skills = Array.isArray(manifest.skills) ? manifest.skills : [];

// 复制前确保 .claude/skills/ 存在（首搭时 .claude/ 可能尚未生成）
mkdirSync(skillsDir, { recursive: true });

const installed = [];
const skipped = [];
const missing_payload = [];

for (const s of skills) {
  const { name, source } = s;
  const target = join(skillsDir, name);
  const src = join(harnessDir, source);
  const payloadFile = join(src, "SKILL.md");
  if (existsSync(target)) {
    skipped.push(name);
    console.log(`[ensure-base-skills] 跳过：${name} 已在场（${target}），不碰定制/旧版。`);
  } else if (!existsSync(src) || !existsSync(payloadFile)) {
    // payload 缺失：源目录不存在，或目录存在但缺规范 payload 文件 SKILL.md（空壳）
    missing_payload.push(name);
    console.error(`[ensure-base-skills] 告警：${name} 的 payload 缺失（${src}），无法复制（不阻塞，请重跑 P1）。`);
  } else {
    cpSync(src, target, { recursive: true });
    installed.push(name);
    console.log(`[ensure-base-skills] 已安装：${name} → ${target}`);
  }
}

console.log(JSON.stringify({ installed, skipped, missing_payload }));
process.exit(0);
