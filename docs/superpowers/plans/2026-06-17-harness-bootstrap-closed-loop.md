# harness-bootstrap 渐进式配置闭环 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 harness-bootstrap 的"渐进式 harness 配置"从"散文 loop"升级为"机械闭合 loop"——每个能力搭建前由可执行 preflight 校验画像字段已决，缺失则硬阻塞回写，杜绝"每阶段缺前置信息"。

**Architecture:** 三件事闭合主 loop：(1) 把 `project-definition.md` 改造为**闭合 manifest**（枚举所有能力用到的字段 + 状态语义）；(2) 抽出**能力→字段依赖图**为单一数据文件 `capability-field-map.json`，preflight 脚本与 SKILL.md 共用它；(3) 新增 **preflight-profile.mjs** 作为 Step 0.5 的机械执行体，在编号流程中（含 `all` 连续模式每轮）不可跳过地跑。再补占位符契约、构建溯源、容错、边界路径。改动 = 模板/数据 + 一个脚本 + SKILL.md/progress-schema.md 文档 + `node:test` 断言测试。

**Tech Stack:** Node.js `node:test` + `node:assert`；纯文本模板（Markdown + `{{VAR}}`）；新增一个可执行 `.mjs` 脚本 + 一个 JSON 数据文件。

---

## 诊断对照（给零上下文的执行者）

用户痛点："渐进式 harness 配置逻辑闭环未完全走通，每个阶段配 harness 时缺很多前置信息。"

根因（已在多专家审查中定位）：

| 断点 | 定位 | 本计划覆盖任务 |
|------|------|----------------|
| **闸门游离**：§增量追问 是独立小节，没焊进 Step 0→6；Step 0 只读 progress.md 不读画像 | `SKILL.md` Step 0 | Task 5 |
| **schema 不闭合**：画像无 `primary_language` 等离散字段，`<待…>` 哨兵只覆盖 3 项；brownfield audit 产出对不上 schema | `project-definition.md.tmpl` | Task 1 |
| **占位符契约不统一**：`project-context.md.tmpl` 用 `{{PROJECT_OVERVIEW}}`，画像源用 `{{OVERVIEW}}` | `project-context.md.tmpl` | Task 4 |
| **写时无卡口**：Step 2 直接 Write，无机械校验 | 全流程 | Task 3 + Task 5 |
| **构建无溯源**：progress.md 不记依赖字段/画像版本 | `progress-schema.md` | Task 6 |
| **画像无容错**：progress.md 有容错，project-definition.md 没有 | `progress-schema.md` | Task 7 |
| **边界路径未定义**：跳序/未scaffold/连续模式遇 `<待…>` 行为歧义 | `SKILL.md` | Task 7 |

**关键设计决策：**
- **依赖图单一真源 = `capability-field-map.json`**。SKILL.md 内表格降级为"镜像 + 指针"，preflight 脚本读 JSON。避免两处描述漂移。
- **preflight 是 CLI 脚本而非 CC hook**。PreToolUse Write hook 会在用户日常编码时误触发、作用域错配；改成 SKILL 在 Step 0.5 主动 `node .harness/preflight-profile.mjs <P>` 调用，作用域限定在搭建流程。
- **preflight + map 在 P1 生成到 `.harness/`**，与现有 hooks（P4 生成 .mjs 到 `.harness/hooks/`）同构；断点续传跨会话/跨机器都能复跑校验。

---

## File Structure

| 文件 | 操作 | 责任 |
|------|------|------|
| `assets/templates/harness/project-definition.md.tmpl` | **修改** | 改为闭合 manifest：英文 snake_case 字段键 + 表格 + 状态语义；frontmatter `mode: {{MODE}}` |
| `assets/templates/harness/capability-field-map.json` | **新建** | 能力→所需字段依赖图，权威源 |
| `assets/templates/harness/preflight-profile.mjs` | **新建** | Step 0.5 机械校验脚本（退出码 0/1 + 末行 JSON）|
| `SKILL.md` | **修改** | 插入 Step 0.5 preflight；§增量追问 折叠为指针；连续模式接入；新增边界路径小节 |
| `assets/progress-schema.md` | **修改** | per-[x] 行加构建溯源（画像版本+字段）；新增画像容错策略 |
| `assets/templates/harness/L0/project-context.md.tmpl` | **修改** | `{{PROJECT_OVERVIEW}}` → `{{OVERVIEW}}`（占位符契约统一）|
| `assets/tests/templates/project-definition.test.mjs` | **修改** | 断言改为闭合 manifest 格式 |
| `assets/tests/templates/capability-field-map.test.mjs` | **新建** | 断言依赖图覆盖 P1–P8、字段键合法 |
| `assets/tests/scripts/preflight-profile.test.mjs` | **新建** | TDD：fixture 画像，断言退出码/缺失字段/容错分支 |
| `assets/tests/templates/placeholder-contract.test.mjs` | **新建** | 跨模板占位符契约：每个 `{{VAR}}` 必须声明于 manifest |
| `assets/tests/templates/skill-md.test.mjs` | **新建** | 断言 SKILL.md 含 Step 0.5 preflight + 边界小节 |
| `assets/tests/templates/progress-schema.test.mjs` | **修改** | 断言溯源 + 画像容错条款 |

---

## Task 1: 闭合画像 manifest（project-definition.md.tmpl）

**Files:**
- Modify: `assets/templates/harness/project-definition.md.tmpl`
- Test: `assets/tests/templates/project-definition.test.mjs`

- [ ] **Step 1: 改写失败测试**

把 `assets/tests/templates/project-definition.test.mjs` 全量替换为：

```js
#!/usr/bin/env node
// 测试 project-definition.md.tmpl（画像权威源）闭合 manifest 结构
// 运行: node --test assets/tests/templates/project-definition.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");
const tmpl = readFileSync(
  join(TEMPLATES, "harness", "project-definition.md.tmpl"),
  "utf8",
);

test("frontmatter 含 project_name / mode / updated（mode 占位符化）", () => {
  assert.match(tmpl, /project_name:\s*\{\{PROJECT_NAME\}\}/);
  assert.match(tmpl, /mode:\s*\{\{MODE\}\}/);
  assert.match(tmpl, /updated:\s*\{\{DATE\}\}/);
});

// 闭合字段集：任何能力用到的画像字段都必须在此声明（机器可解析 snake_case 键）
const REQUIRED_FIELDS = [
  "project_name", "overview", "tech_stack_intent", "app_type",
  "hard_constraints", "primary_language", "lint_config",
  "collab_mode", "tech_stack_detail",
];

test("字段清单表格含全部闭合字段（每项一行 `| key | value |`）", () => {
  for (const f of REQUIRED_FIELDS) {
    assert.match(tmpl, new RegExp(`\\|\\s*${f}\\s*\\|`), `缺字段行: ${f}`);
  }
});

test("首轮字段用 {{VAR}} 占位符（生成期替换）", () => {
  assert.match(tmpl, /\|\s*project_name\s*\|\s*\{\{PROJECT_NAME\}\}\s*\|/);
  assert.match(tmpl, /\|\s*overview\s*\|\s*\{\{OVERVIEW\}\}\s*\|/);
  assert.match(tmpl, /\|\s*tech_stack_intent\s*\|\s*\{\{TECH_STACK_INTENT\}\}\s*\|/);
  assert.match(tmpl, /\|\s*app_type\s*\|\s*\{\{APP_TYPE\}\}\s*\|/);
  assert.match(tmpl, /\|\s*hard_constraints\s*\|\s*\{\{HARD_CONSTRAINTS\}\}\s*\|/);
});

test("追问字段用 <待…> 缺失哨兵", () => {
  assert.match(tmpl, /\|\s*primary_language\s*\|[^|]*<待[^>]*P5/i);
  assert.match(tmpl, /\|\s*lint_config\s*\|[^|]*<待[^>]*P5/i);
  assert.match(tmpl, /\|\s*collab_mode\s*\|[^|]*<待[^>]*P6/i);
  assert.match(tmpl, /\|\s*tech_stack_detail\s*\|[^|]*<待[^>]*P7/i);
});

test("声明状态语义：<待…> = 未决，其余（含「无」/N/A）= 已决", () => {
  assert.match(tmpl, /状态语义|未决|preflight/i);
});

test("指向依赖图权威源 capability-field-map.json", () => {
  assert.match(tmpl, /capability-field-map\.json/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/templates/project-definition.test.mjs`
Expected: FAIL（旧模板是散文小节，无表格行 / 无 mode 占位符 / 无依赖图指针）。

- [ ] **Step 3: 重写模板为闭合 manifest**

把 `assets/templates/harness/project-definition.md.tmpl` 全量替换为：

```markdown
---
project_name: {{PROJECT_NAME}}
mode: {{MODE}}
updated: {{DATE}}
---

# 项目定义（画像权威源）

> 所有能力智能填充、所有追问读写的**唯一来源**。`progress.md` 仅存指针指向本文件。
>
> **字段状态语义**：值含 `<待` = **未决**（preflight 会拦截，须先追问回写）；其余任何值（含「无」/`N/A`）= **已决**。
> **依赖图权威源**：`.harness/capability-field-map.json`（preflight 脚本与 SKILL.md Step 0.5 据此校验；下表为其镜像）。

## 字段清单（闭合；preflight 据「值」列判定已决/未决）

| 字段 | 值 | 来源 | 喂养的能力 |
|------|-----|------|-----------|
| project_name | {{PROJECT_NAME}} | 首轮必答 | 全产物占位符 |
| overview | {{OVERVIEW}} | 首轮必答 | project-context §1 |
| tech_stack_intent | {{TECH_STACK_INTENT}} | 首轮必答 | project-context §2/§4, P4 探测 |
| app_type | {{APP_TYPE}} | 首轮必答 | P3 条件闸门 |
| hard_constraints | {{HARD_CONSTRAINTS}} | 首轮选答·可空（无则「无」）| P5, project-context §5 |
| primary_language | <待 P5 前追问> | 追问·P5 | P5, P7 |
| lint_config | <待 P5 前追问> | 追问·P5 | P5, P4 |
| collab_mode | <待 P6 前追问> | 追问·P6 | P6, P7 |
| tech_stack_detail | <待 P7 前追问/scaffold 后回填> | 追问·P7 | P7 |

<!-- brownfield audit 命中主语言/lint/技术栈细化时，直接把对应 <待…> 替换为实际值，不要重复追问（见 SKILL.md §首次判定）。 -->
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/templates/project-definition.test.mjs`
Expected: PASS（全部 6 条）。

- [ ] **Step 5: 提交**

```bash
git add assets/templates/harness/project-definition.md.tmpl assets/tests/templates/project-definition.test.mjs
git commit -m "refactor(profile): project-definition 改为闭合 manifest（枚举全字段+状态语义）"
```

---

## Task 2: 能力→字段依赖图 capability-field-map.json

**Files:**
- Create: `assets/templates/harness/capability-field-map.json`
- Test: `assets/tests/templates/capability-field-map.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/capability-field-map.test.mjs`:

```js
#!/usr/bin/env node
// 测试 capability-field-map.json（能力→画像字段依赖图，preflight 权威源）
// 运行: node --test assets/tests/templates/capability-field-map.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");
const raw = readFileSync(
  join(TEMPLATES, "harness", "capability-field-map.json"),
  "utf8",
);
const map = JSON.parse(raw);

const KNOWN_FIELDS = new Set([
  "project_name", "overview", "tech_stack_intent", "app_type",
  "hard_constraints", "primary_language", "lint_config",
  "collab_mode", "tech_stack_detail",
]);

test("覆盖 P1–P8 全部能力", () => {
  for (const p of ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"]) {
    assert.ok(map.capabilities[p], `缺能力: ${p}`);
    assert.ok(Array.isArray(map.capabilities[p].requires), `${p}.requires 须为数组`);
  }
});

test("requires 中每个字段都声明于 manifest 闭合字段集", () => {
  for (const [cap, spec] of Object.entries(map.capabilities)) {
    for (const f of spec.requires) {
      assert.ok(KNOWN_FIELDS.has(f), `${cap} 引用了未声明字段: ${f}`);
    }
  }
});

test("P5 依赖主语言/lint/硬约束（修复原『主语言无字段』断点）", () => {
  const r = new Set(map.capabilities.P5.requires);
  for (const f of ["primary_language", "lint_config", "hard_constraints"]) {
    assert.ok(r.has(f), `P5 缺依赖: ${f}`);
  }
});

test("P6 依赖协作模式；P7 依赖技术栈细化/应用类型/协作模式", () => {
  assert.ok(new Set(map.capabilities.P6.requires).has("collab_mode"));
  const p7 = new Set(map.capabilities.P7.requires);
  for (const f of ["tech_stack_detail", "app_type", "collab_mode"]) {
    assert.ok(p7.has(f), `P7 缺依赖: ${f}`);
  }
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/templates/capability-field-map.test.mjs`
Expected: FAIL（文件不存在 → readFileSync 抛错）。

- [ ] **Step 3: 创建依赖图**

Create `assets/templates/harness/capability-field-map.json`:

```json
{
  "_meta": {
    "purpose": "能力→所需画像字段 依赖图。preflight-profile.mjs 与 SKILL.md Step 0.5 据此校验。本文件为权威源；SKILL.md 内表格为其镜像。",
    "status_semantics": "<待…> = 未决（须追问回写）；其余任何值（含「无」/N/A）= 已决",
    "shipped_to": ".harness/capability-field-map.json"
  },
  "capabilities": {
    "P1": { "requires": [], "notes": "骨架；首轮问答在搭 P1 前已完成" },
    "P2": { "requires": [], "notes": "文档结构，无画像依赖" },
    "P3": { "requires": ["app_type"], "notes": "应用类型决定是否生成 UI/平台条件闸门" },
    "P4": { "requires": [], "notes": "通用 hooks" },
    "P5": { "requires": ["primary_language", "lint_config", "hard_constraints"], "notes": "主语言/lint 决定编码规范与 auto-format/auto-check" },
    "P6": { "requires": ["collab_mode"], "notes": "协作模式决定提交协作严格度" },
    "P7": { "requires": ["tech_stack_detail", "app_type", "collab_mode"], "notes": "领域专家画像" },
    "P8": { "requires": [], "notes": "OpenSpec，无画像依赖" }
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/templates/capability-field-map.test.mjs`
Expected: PASS（4 条）。

- [ ] **Step 5: 提交**

```bash
git add assets/templates/harness/capability-field-map.json assets/tests/templates/capability-field-map.test.mjs
git commit -m "feat(profile): 新增 capability-field-map.json 能力→字段依赖图（preflight 权威源）"
```

---

## Task 3: preflight 机械校验脚本（preflight-profile.mjs，TDD）

**Files:**
- Create: `assets/templates/harness/preflight-profile.mjs`
- Test: `assets/tests/scripts/preflight-profile.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/scripts/preflight-profile.test.mjs`:

```js
#!/usr/bin/env node
// 测试 preflight-profile.mjs（Step 0.5 画像装配机械校验）
// 运行: node --test assets/tests/scripts/preflight-profile.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(here, "..", "..", "templates", "harness", "preflight-profile.mjs");

const FIXTURE_MAP = JSON.stringify({
  capabilities: {
    P1: { requires: [] },
    P5: { requires: ["primary_language", "lint_config", "hard_constraints"] },
  },
});

function makeProject(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "preflight-"));
  mkdirSync(join(dir, ".harness"), { recursive: true });
  const base = {
    project_name: "demo", overview: "o", tech_stack_intent: "Node",
    app_type: "CLI", hard_constraints: "无",
    primary_language: "<待 P5 前追问>", lint_config: "<待 P5 前追问>",
    collab_mode: "<待 P6 前追问>", tech_stack_detail: "<待 P7 前追问>",
    ...overrides,
  };
  const lines = ["# x", "", "| 字段 | 值 | 来源 | 喂养的能力 |", "|---|---|---|---|"];
  for (const [k, v] of Object.entries(base)) lines.push(`| ${k} | ${v} | s | c |`);
  writeFileSync(join(dir, ".harness", "project-definition.md"), lines.join("\n") + "\n");
  writeFileSync(join(dir, ".harness", "capability-field-map.json"), FIXTURE_MAP);
  return dir;
}

function run(projectDir, cap) {
  try {
    const out = execFileSync("node", [SCRIPT, cap, "--project", projectDir], {
      encoding: "utf8",
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

test("P5 依赖字段未决 → 退出码 1 且列出缺失", () => {
  const dir = makeProject();
  const r = run(dir, "P5");
  assert.equal(r.code, 1);
  assert.match(r.out, /primary_language/);
  assert.match(r.out, /lint_config/);
  rmSync(dir, { recursive: true, force: true });
});

test("P5 依赖字段已决 → 退出码 0", () => {
  const dir = makeProject({ primary_language: "TypeScript", lint_config: "eslint+prettier" });
  assert.equal(run(dir, "P5").code, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("hard_constraints=「无」视为已决（不误报）", () => {
  const dir = makeProject({ primary_language: "TS", lint_config: "eslint", hard_constraints: "无" });
  assert.equal(run(dir, "P5").code, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("末行输出 JSON 摘要供 SKILL 解析", () => {
  const dir = makeProject();
  const r = run(dir, "P5");
  const last = r.out.trim().split("\n").pop();
  const j = JSON.parse(last);
  assert.equal(j.ready, false);
  assert.ok(j.missing.length >= 2);
  rmSync(dir, { recursive: true, force: true });
});

test("project-definition.md 不存在 → 放行（首次搭 P1）", () => {
  const dir = mkdtempSync(join(tmpdir(), "empty-"));
  assert.equal(run(dir, "P1").code, 0);
  rmSync(dir, { recursive: true, force: true });
});

test("P1 无依赖 → 已决", () => {
  const dir = makeProject();
  assert.equal(run(dir, "P1").code, 0);
  rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/scripts/preflight-profile.test.mjs`
Expected: FAIL（脚本不存在）。

- [ ] **Step 3: 实现脚本**

Create `assets/templates/harness/preflight-profile.mjs`:

```js
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/scripts/preflight-profile.test.mjs`
Expected: PASS（6 条）。

- [ ] **Step 5: 提交**

```bash
git add assets/templates/harness/preflight-profile.mjs assets/tests/scripts/preflight-profile.test.mjs
git commit -m "feat(preflight): 新增 preflight-profile.mjs 机械校验画像字段已决（Step 0.5 执行体）"
```

---

## Task 4: 占位符契约统一（修 project-context + 跨模板契约测试）

**Files:**
- Modify: `assets/templates/harness/L0/project-context.md.tmpl`（`{{PROJECT_OVERVIEW}}` → `{{OVERVIEW}}`）
- Create: `assets/tests/templates/placeholder-contract.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/placeholder-contract.test.mjs`:

```js
#!/usr/bin/env node
// 跨模板占位符契约：每个 {{VAR}} 必须声明于画像 manifest，或是结构型变量
// 运行: node --test assets/tests/templates/placeholder-contract.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");

// 结构型变量（非画像值）：日期/模式等生成期注入
const STRUCTURAL = new Set(["DATE", "MODE"]);

// 从 manifest 提取合法字段名（大写形式）
const manifest = readFileSync(
  join(ROOT, "templates", "harness", "project-definition.md.tmpl"),
  "utf8",
);
const DECLARED = new Set(
  [...manifest.matchAll(/^\|\s*([a-z_][a-z0-9_]*)\s*\|/gim)].map((m) =>
    m[1].toUpperCase(),
  ),
);

// 收集所有 .tmpl 里的 {{VAR}}
const TMPL_DIR = join(ROOT, "templates");
function* walk(dir) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith(".tmpl")) yield p;
  }
}

const used = new Map(); // VAR -> [files]
for (const f of walk(TMPL_DIR)) {
  const txt = readFileSync(f, "utf8");
  for (const m of txt.matchAll(/\{\{\s*([A-Z][A-Z0-9_]*)\s*\}\}/g)) {
    const v = m[1];
    if (!used.has(v)) used.set(v, []);
    used.get(v).push(relative(ROOT, f));
  }
}

test("每个 {{VAR}} 都声明于 manifest 或属于结构型变量", () => {
  const undeclared = [...used.keys()].filter(
    (v) => !DECLARED.has(v) && !STRUCTURAL.has(v),
  );
  assert.deepEqual(
    undeclared,
    [],
    `未声明占位符（须改用 manifest 字段名或加入 STRUCTURAL）: ${undeclared.join(", ")}`,
  );
});

test("OVERVIEW 在 project-context.md.tmpl 中使用（非 PROJECT_OVERVIEW）", () => {
  const pc = readFileSync(
    join(TMPL_DIR, "harness", "L0", "project-context.md.tmpl"),
    "utf8",
  );
  assert.ok(!/\{\{\s*PROJECT_OVERVIEW\s*\}\}/.test(pc), "仍残留 {{PROJECT_OVERVIEW}}");
  assert.match(pc, /\{\{\s*OVERVIEW\s*\}\}/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/templates/placeholder-contract.test.mjs`
Expected: FAIL（`project-context.md.tmpl` 用 `{{PROJECT_OVERVIEW}}`，不在 DECLARED 也不在 STRUCTURAL）。

- [ ] **Step 3: 修复占位符**

在 `assets/templates/harness/L0/project-context.md.tmpl` 中，把 `{{PROJECT_OVERVIEW}}` 改为 `{{OVERVIEW}}`（§1 标题下那行）。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/templates/placeholder-contract.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add assets/templates/harness/L0/project-context.md.tmpl assets/tests/templates/placeholder-contract.test.mjs
git commit -m "fix(templates): 统一占位符契约 {{PROJECT_OVERVIEW}}→{{OVERVIEW}}，加跨模板契约测试"
```

---

## Task 5: SKILL.md 接入 Step 0.5 preflight（含 all 模式）

**Files:**
- Modify: `SKILL.md`
- Create: `assets/tests/templates/skill-md.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/skill-md.test.mjs`:

```js
#!/usr/bin/env node
// 测试 SKILL.md 含 Step 0.5 preflight 闭合 loop
// 运行: node --test assets/tests/templates/skill-md.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const skill = readFileSync(join(ROOT, "SKILL.md"), "utf8");

test("执行流程含 Step 0.5 画像装配 preflight", () => {
  assert.match(skill, /Step 0\.5[:：]/);
  assert.match(skill, /preflight-profile\.mjs/);
});

test("Step 0.5 语义：退出码 0 放行 / 1 阻塞回写", () => {
  assert.match(skill, /退出码\s*0/i);
  assert.match(skill, /退出码\s*1|BLOCK/i);
});

test("连续模式（all）明确接入 preflight（每轮跑）", () => {
  assert.match(skill, /连续模式.*preflight|preflight.*连续模式|all.*每轮/s);
});

test("§增量追问 折叠为指针（指向 map + preflight），不再独立承载映射表", () => {
  // 仍可保留镜像表格，但须声明权威源为 capability-field-map.json
  assert.match(skill, /capability-field-map\.json/);
});

test("含边界与失败模式小节", () => {
  assert.match(skill, /边界|失败模式/i);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/templates/skill-md.test.mjs`
Expected: FAIL（SKILL.md 当前无 Step 0.5、preflight 引用、边界小节）。

- [ ] **Step 3: 改 SKILL.md（三处）**

**(3a) 执行流程里 Step 0 与 Step 1 之间插入 Step 0.5：**

在 `### Step 0: 判定模式` 整块之后、`### Step 1: 确认目标能力` 之前，插入：

```markdown
### Step 0.5: 画像装配 preflight（每次必跑，含连续模式每轮）

Step 0 解析出目标能力后、Step 1 之前，跑机械校验（机械牙齿，不靠记忆）：

node .harness/preflight-profile.mjs <目标 P{n}|all>

- **退出码 0**（ready）→ 进入 Step 1。
- **退出码 1**（block）→ 末行 JSON `{ready:false, missing:[...]}` 列出未决字段。按 §增量追问逐项补到 `.harness/project-definition.md`（选项型用 AskUserQuestion ≤4 选项+Other；开放型用普通对话），**回写后再跑 preflight 直到 0**，方可进入 Step 1。
- **连续（`all`）模式**：每轮搭建前都跑 preflight；遇 block 即在该能力处暂停补问，补完继续——**不跳过、不臆测**。
- **`project-definition.md` 不存在** → 视为首次，走 §首次判定搭 P1（P1 无追问依赖，preflight 放行）。

> preflight 与依赖图（`capability-field-map.json`）均在 P1 生成到 `.harness/`。断点续传跨会话都能复跑校验。
```

**(3b) 把现有 `## 增量追问（按能力映射表驱动，每次搭建前）` 小节开头改为指针式**（保留镜像表格，但声明权威源）。在该小节标题下方、表格上方插入一行：

```markdown
> **权威源**：`.harness/capability-field-map.json`（preflight 脚本据此校验）。下表为镜像，如有出入以 JSON 为准。
> 追问流程已并入 **Step 0.5 preflight**：preflight 报 block → 按下表所需字段追问 → 回写 → 复跑 preflight。
```

**(3c) 连续模式分支补一句**：在 `### Step 0` 的 `参数为 all → 连续模式` 要点里追加：

```markdown
连续模式每轮搭建前 MUST 先过 Step 0.5 preflight（遇 block 单点暂停补问，补完续跑）。
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/templates/skill-md.test.mjs`
Expected: PASS（5 条）。

- [ ] **Step 5: 提交**

```bash
git add SKILL.md assets/tests/templates/skill-md.test.mjs
git commit -m "feat(skill): 接入 Step 0.5 preflight 闭合 loop（含连续模式 + 依赖图指针）"
```

---

## Task 6: progress.md 构建溯源

**Files:**
- Modify: `assets/progress-schema.md`
- Test: `assets/tests/templates/progress-schema.test.mjs`

- [ ] **Step 1: 写失败测试**

在 `assets/tests/templates/progress-schema.test.mjs` 末尾追加（保留既有用例）：

```js
test("per-[x] 行含构建溯源（画像版本 + 依赖字段）", () => {
  const s = readFileSync(join(TEMPLATES, "..", "progress-schema.md"), "utf8");
  assert.match(s, /画像v|profile.{0,3}ver/i);
  assert.match(s, /字段:\s*\[/);
});

test("声明画像变更触发重校验语义", () => {
  const s = readFileSync(join(TEMPLATES, "..", "progress-schema.md"), "utf8");
  assert.match(s, /重校验|stale|晚于/s);
});
```

（如该测试文件顶部已有 `TEMPLATES`/`readFileSync` 导入，复用；否则补导入。）

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/templates/progress-schema.test.mjs`
Expected: 新增用例 FAIL。

- [ ] **Step 3: 改 progress-schema.md**

在 `## 模板` 代码块内，把能力行格式从：
```
- [x] P1 骨架      @{{DATE}}   已搭: CLAUDE.md/AGENTS.md/.harness/L0/progress.md
```
改为（增加溯源列）：
```
- [x] P1 骨架  @{{DATE}}  画像v{{PROFILE_DATE}}  字段:[project_name]  已搭: CLAUDE.md/AGENTS.md/.harness/L0/progress.md
```

并在 `## 断点续传语义` 末尾加一条：

```markdown
- **构建溯源**：每个 `- [x]` 行记录搭建时所用画像版本（`画像v{{PROFILE_DATE}}`，取自 project-definition.md 的 `updated`）与依赖字段清单。若后续 `project-definition.md` 的 `updated` 晚于某 `[x]` 能力的 `画像v`，提示用户该能力可能需**重校验**（画像已变，原产物可能失配）。
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/templates/progress-schema.test.mjs`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add assets/progress-schema.md assets/tests/templates/progress-schema.test.mjs
git commit -m "feat(progress): per-[x] 行加构建溯源（画像版本+依赖字段）支持失配重校验"
```

---

## Task 7: 画像容错 + 边界路径

**Files:**
- Modify: `assets/progress-schema.md`（画像容错）
- Modify: `SKILL.md`（边界小节）
- Test: 复用 `skill-md.test.mjs`（Task 5 已含边界断言）+ 追加 progress-schema 容错断言

- [ ] **Step 1: 追加容错失败测试**

在 `assets/tests/templates/progress-schema.test.mjs` 末尾追加：

```js
test("声明 project-definition.md 损坏的容错策略", () => {
  const s = readFileSync(join(TEMPLATES, "..", "progress-schema.md"), "utf8");
  assert.match(s, /project-definition\.md[\s\S]*容错|画像[\s\S]*无法解析[\s\S]*确认/s);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/templates/progress-schema.test.mjs`
Expected: 新用例 FAIL。

- [ ] **Step 3: 在 progress-schema.md 加画像容错条款**

在 `## 断点续传语义` 末尾再加一条（与 progress.md 自身容错对称）：

```markdown
- **画像容错**：若 `.harness/project-definition.md` 整体无法解析（被清空/损坏/字段表缺失），**不臆测推进**——用 git 历史 `git show HEAD:.harness/project-definition.md` 反推最近有效画像，向用户**逐字段确认**后重建，再继续。preflight 脚本对"画像缺失"分支放行首次搭 P1，对"字段表存在但值损坏"由本条款兜底。
```

- [ ] **Step 4: 在 SKILL.md 加「边界与失败模式」小节**

在 `## Guardrails（铁律）` 之前插入：

```markdown
## 边界与失败模式

| 场景 | 行为 |
|------|------|
| **跳序直搭**（`/harness-bootstrap P7`）| Step 0.5 preflight 按 P7 依赖图拦截；缺啥问啥，回写后复跑，不硬搭。 |
| **greenfield 未 scaffold 就到 P7** | `tech_stack_detail` 标 `<待 scaffold 后回填>`，preflight 报 block → 暂停，提示用户先 scaffold 或手填意向版本。 |
| **连续模式遇 `<待…>`** | Step 0.5 单点暂停补问，补完续跑；不跳过、不臆测。 |
| **画像被损坏** | 走 progress-schema 画像容错条款：git 反推 + 逐字段确认，不臆测。 |
| **preflight/map 缺失** | 提示重新生成 P1（P1 负责落 preflight + map 到 `.harness/`）。 |
```

- [ ] **Step 5: 跑测试确认通过**

Run: `node --test assets/tests/templates/progress-schema.test.mjs assets/tests/templates/skill-md.test.mjs`
Expected: PASS。

- [ ] **Step 6: 提交**

```bash
git add assets/progress-schema.md SKILL.md assets/tests/templates/progress-schema.test.mjs
git commit -m "feat(skill): 画像容错策略 + 边界与失败模式小节（跳序/未scaffold/连续/损坏）"
```

---

## Task 8: 全量回归 + 收尾

- [ ] **Step 1: 跑全量测试套件**

Run: `node --test assets/tests/**/*.test.mjs`
Expected: 全部 PASS（含原有 hooks/templates 用例 + 本计划新增 6 个测试文件）。

> 若 shell 不支持 `**` glob，用：
> `node --test $(git ls-files 'assets/tests/**/*.test.mjs')`

- [ ] **Step 2: 交叉一致性自检**

手动核验（人工 checkpoint，非脚本）：
- `capability-field-map.json` 的字段键 ⊆ `project-definition.md.tmpl` 字段清单（Task 2 测试已覆盖单方向；这里确认无遗漏字段）。
- `SKILL.md` Step 0.5 引用的命令与 `preflight-profile.mjs` 用法一致（`<P{n}|all> [--project <dir>]`）。
- `progress-schema.md` 的 `画像v{{PROFILE_DATE}}` 占位符已在 placeholder-contract 白名单（STRUCTURAL）里——若不在，回 Task 4 把 `PROFILE_DATE` 加入 STRUCTURAL 并加测试。

- [ ] **Step 3: 提交收尾**

```bash
git add -A
git commit -m "test: 全量回归通过（闭合 loop: preflight + manifest + 依赖图 + 契约 + 溯源 + 容错）"
git log --oneline -9
```

---

## 验收标准（对照用户痛点）

1. **闭环接通**：`/harness-bootstrap P5` 在 `primary_language`/`lint_config` 未决时，Step 0.5 preflight 退出码 1 → 必须先追问回写 → 不再"硬着头皮搭出与技术栈错配的规范"。
2. **schema 闭合**：画像 manifest 枚举全部字段；`primary_language` 不再"无字段可查"。
3. **机械牙齿**：preflight 脚本可独立复跑，退出码 + JSON 摘要，散文 loop 变可执行 loop。
4. **占位符契约**：跨模板无未声明 `{{VAR}}`；`{{PROJECT_OVERVIEW}}` 漂移被测试永久锁死。
5. **跨会话可用**：preflight + map 落 `.harness/`，断点续传/换机都能复跑校验。
6. **可演进**：新增能力只需在 `capability-field-map.json` 加一行 + manifest 加一字段，preflight 自动覆盖。

## 非目标

- 不改 P1–P8 能力划分与产物范围。
- 不改 brownfield audit 识别逻辑本身（只让它把命中值回写进 manifest 对应 `<待…>`，见 Task 1 注释 + SKILL.md §首次判定）。
- 不引入外部依赖（保持 `node:test` 零安装）。

---

## 审查修订 (v2) — 执行以本节为准

多专家审查（信息流 / TDD / 回归风险 / YAGNI 视角，已对照实际文件验证）发现以下缺陷。执行时按本节修正；与原 Task 描述冲突处，以本节为准。

### 🔴 必修（正确性）

**A1 — Task 5 改为 Modify skill-md.test.mjs（已存在，勿 Create 覆盖）**
现存 `assets/tests/templates/skill-md.test.mjs` 已含 6 条断言。Task 5 改为：**保留全部既有断言 + 追加** 以下 5 条（已验证 SKILL.md 编辑不破坏既有 6 条）：
Step 0.5 / `preflight-profile.mjs` / 退出码 0/1 / 连续模式+preflight / `capability-field-map.json` / 边界。

**A2 — Task 6 追加用例复用既有 `tmpl`，勿引用不存在的 `TEMPLATES`**
```js
test("per-[x] 行含构建溯源（画像版本 + 依赖字段）", () => {
  assert.match(tmpl, /画像v|PROFILE_DATE/i);
  assert.match(tmpl, /字段:\s*\[/);
});
test("声明画像变更触发重校验", () => {
  assert.match(tmpl, /重校验|stale/s);
});
```

**A3 — 新增 SKILL.md 编辑（并入 Task 5 为 Step 3d）**
- P1–P8 能力表 P1 行产物追加 `.harness/preflight-profile.mjs` + `.harness/capability-field-map.json`。
- §首次判定（greenfield & brownfield）与 Step 2 补：P1 搭建时把这两个文件从 `assets/templates/harness/` 复制到 `.harness/`。

**A4 — Task 4 增加同步改测试**
Task 4 额外修改 `assets/tests/templates/project-context.test.mjs`：把 `assert.match(tmpl, /\{\{PROJECT_OVERVIEW\}\}/)` 改为 `\{\{OVERVIEW\}\}`。

**A5 — brownfield audit → manifest 键映射（并入 Task 5 为 Step 3e）**
§首次判定 brownfield 段补映射：audit 命中「主语言 / 格式化-lint / 技术栈细化」→ 分别写入 manifest 的 `primary_language` / `lint_config` / `tech_stack_detail` 键（替换 `<待…>`），不重复追问。

### 🟠 优化（已采纳）

- **O1**：Task 6 构建溯源保留。
- **O2**：Task 4 的 placeholder-contract.test.mjs：(a) `STRUCTURAL` 加 `PROFILE_DATE`；(b) 额外扫描 `assets/progress-schema.md`（非 .tmpl，单独 readFileSync 并跑同一断言）。
- **O3**：Step 0.5 补注：连续模式可选先跑 `node .harness/preflight-profile.mjs all` 批量预问，减少逐轮打断。
- **O4**：Task 3 fixture 内联 map 顶部注释「测试用精简 map（仅 P1/P5）；真实见 capability-field-map.json」。

### ✅ 复核通过（无需改）
提交格式对齐 commit-conventions；TDD 顺序 1→2→3 正确；preflight 正则与 manifest 格式匹配。
