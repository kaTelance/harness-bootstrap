# smart-advisor 基础 skill 自动分发 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 harness-bootstrap 在为目标项目搭建时，自动把 smart-advisor 作为「基础 skill（substrate）」幂等分发到目标项目 `.claude/skills/smart-advisor/`。

**Architecture:** 三件机械同构于既有 preflight 闭环：(1) 把 smart-advisor 文件 **vendor** 进 `assets/templates/harness/base-skills/smart-advisor/`；(2) 新增清单 `base-skills.json`（唯一真源，镜像 `capability-field-map.json` 风格）；(3) 新增 `ensure-base-skills.mjs` 幂等执行体——SKILL 在 Step 0 前置 / P1 末尾主动 `node` 调用，遍历清单把每个 skill 从 `.harness/base-skills/<source>/` 复制到 `.claude/skills/<name>/`，在场即跳过。P1 把清单+脚本+payload 原样复制到 `.harness/`（与 preflight-profile.mjs + capability-field-map.json 同批）。

**Tech Stack:** Node.js `node:test` + `node:assert`；纯文本模板（smart-advisor 自包含无 `{{VAR}}`，verbatim 复制）；新增一个可执行 `.mjs` 脚本 + 一个 JSON 数据文件 + vendor payload。

---

## 诊断对照（给零上下文的执行者）

需求：调用 harness-bootstrap 时，自动把全局 `smart-advisor` skill 作为基础 skill 落到目标项目 `.claude/skills/`。

设计决策（详见 spec `docs/superpowers/specs/2026-06-17-smart-advisor-base-skill-design.md`）：

| 维度 | 决策 |
|------|------|
| 分发机制 | **Vendor** 进模板（自包含/离线/版本锁定/跨机可复现），不运行时从全局复制 |
| 生命周期 | **基础层 substrate**：每次调用最前置幂等确保，**不计** progress.md checkbox |
| 幂等策略 | **在场即跳过·纯幂等**：缺则装、有则不碰（尊重定制/旧版，不自动刷新）|
| 机制化 | **清单 `base-skills.json` + `ensure-base-skills.mjs` 脚本**（node 调用，可测，可扩展）|

**关键设计点：**
- **路径解析对齐 preflight**：ensure 脚本读 `<projectDir>/.harness/base-skills.json` 与 `<projectDir>/.harness/<source>/`（project 相对），而非脚本自身位置——这样测试可用 tmpdir fixture 注入，且 shipped 到目标 `.harness/` 后天然指向同级清单/payload。
- **两跳模型**：P1 把 vendor 副本 ship 到 `.harness/base-skills/`（跳 1，机械可复现）；ensure 从 `.harness/base-skills/` 复制到 `.claude/skills/`（跳 2，幂等）。暂存于 `.harness/` 是必要的——否则后续调用无法在用户删除后自主重装。
- **首调时序三态**（避免 fresh 首调跑不存在的脚本）：脚本存在→跑；脚本不存在且 progress.md 不存在（fresh）→静默跳过、首装交 P1 末尾；脚本不存在但 progress.md 存在（老项目）→提示 P1 幂等补全。

---

## File Structure

| 文件 | 操作 | 责任 |
|------|------|------|
| `assets/templates/harness/base-skills/smart-advisor/SKILL.md` | **新建（vendor）** | verbatim 快照自 `~/.claude/skills/smart-advisor/SKILL.md` |
| `assets/templates/harness/base-skills/smart-advisor/examples.md` | **新建（vendor）** | verbatim 快照自 `~/.claude/skills/smart-advisor/examples.md` |
| `assets/templates/harness/base-skills.json` | **新建** | 基础 skill 清单（唯一真源；ship 到 `.harness/base-skills.json`）|
| `assets/templates/harness/ensure-base-skills.mjs` | **新建** | 幂等 ensure 执行体（ship 到 `.harness/ensure-base-skills.mjs`）|
| `SKILL.md` | **修改** | 新增 Step 0 前置；P1 产物表 + Step 2 P1 专属扩展；边界表加 3 行 |
| `assets/tests/templates/base-skills.test.mjs` | **新建** | 断言清单合法 + vendor payload 完整 |
| `assets/tests/scripts/ensure-base-skills.test.mjs` | **新建** | TDD：fixture，断言复制/跳过/幂等/降级/退出码 |
| `assets/tests/templates/skill-md.test.mjs` | **修改** | 追加 5 条断言（Step 0 前置 / 三态 / P1 机械 / P1 末尾 ensure / 边界）|

---

## Task 1: vendor payload + base-skills.json 清单（TDD）

**Files:**
- Create: `assets/templates/harness/base-skills/smart-advisor/SKILL.md`（vendor）
- Create: `assets/templates/harness/base-skills/smart-advisor/examples.md`（vendor）
- Create: `assets/templates/harness/base-skills.json`
- Test: `assets/tests/templates/base-skills.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/base-skills.test.mjs`:

```js
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/templates/base-skills.test.mjs`
Expected: FAIL（`base-skills.json` 不存在 → readFileSync 抛错）。

- [ ] **Step 3: vendor smart-advisor payload + 写清单**

先确认全局 smart-advisor 源在位：

```bash
ls "$HOME/.claude/skills/smart-advisor/SKILL.md" "$HOME/.claude/skills/smart-advisor/examples.md"
```

vendor（verbatim 快照）：

```bash
mkdir -p assets/templates/harness/base-skills/smart-advisor
cp "$HOME/.claude/skills/smart-advisor/SKILL.md" assets/templates/harness/base-skills/smart-advisor/SKILL.md
cp "$HOME/.claude/skills/smart-advisor/examples.md" assets/templates/harness/base-skills/smart-advisor/examples.md
```

Create `assets/templates/harness/base-skills.json`:

```json
{
  "_meta": {
    "purpose": "项目基础 skill 清单。ensure-base-skills.mjs 据此把每个 skill 从 .harness/<source>/ 复制到 .claude/skills/<name>/。",
    "shipped_to": ".harness/base-skills.json",
    "idempotency": "缺失→复制；在场→不碰（纯幂等，尊重用户定制）"
  },
  "skills": [
    { "name": "smart-advisor", "source": "base-skills/smart-advisor" }
  ]
}
```

> `source` 为相对 `.harness/` 的路径，指向 P1 ship 到 `.harness/base-skills/<source>/` 的 payload。`name` 既是 `.claude/skills/` 下目录名，也是 SKILL.md frontmatter 的 `name`。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/templates/base-skills.test.mjs`
Expected: PASS（3 条）。

- [ ] **Step 5: 提交**

```bash
git add assets/templates/harness/base-skills.json assets/templates/harness/base-skills/smart-advisor/SKILL.md assets/templates/harness/base-skills/smart-advisor/examples.md assets/tests/templates/base-skills.test.mjs
git commit -m "feat(base-skills): vendor smart-advisor payload + base-skills.json 清单"
```

---

## Task 2: ensure-base-skills.mjs 幂等执行体（TDD）

**Files:**
- Create: `assets/templates/harness/ensure-base-skills.mjs`
- Test: `assets/tests/scripts/ensure-base-skills.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/scripts/ensure-base-skills.test.mjs`:

```js
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/scripts/ensure-base-skills.test.mjs`
Expected: FAIL（脚本不存在 → execFileSync 抛错）。

- [ ] **Step 3: 实现脚本**

Create `assets/templates/harness/ensure-base-skills.mjs`:

```js
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
  if (existsSync(target)) {
    skipped.push(name);
    console.log(`[ensure-base-skills] 跳过：${name} 已在场（${target}），不碰定制/旧版。`);
  } else if (!existsSync(src)) {
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/scripts/ensure-base-skills.test.mjs`
Expected: PASS（6 条）。

- [ ] **Step 5: 提交**

```bash
git add assets/templates/harness/ensure-base-skills.mjs assets/tests/scripts/ensure-base-skills.test.mjs
git commit -m "feat(base-skills): ensure-base-skills.mjs 基础 skill 层幂等 ensure（Step 0 前置执行体）"
```

---

## Task 3: SKILL.md 接入 Step 0 前置 + P1 落机械 + 边界（TDD）

**Files:**
- Modify: `SKILL.md`
- Modify: `assets/tests/templates/skill-md.test.mjs`（追加 5 条断言）

- [ ] **Step 1: 追加失败断言**

在 `assets/tests/templates/skill-md.test.mjs` 末尾（第 79 行后）追加：

```js

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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test assets/tests/templates/skill-md.test.mjs`
Expected: 既有 12 条 PASS，新增 5 条 FAIL（SKILL.md 尚无 Step 0 前置 / base-skills 机械 / 边界行）。

- [ ] **Step 3a: 插入「Step 0 前置」**

在 `SKILL.md` 中，定位到：

```
## 执行流程（每次 `/harness-bootstrap [可选 P{n}|all]`）

### Step 0: 判定模式
```

在 `## 执行流程...` 标题行与 `### Step 0: 判定模式` 之间，插入：

```markdown
### Step 0 前置：基础 skill 层确保（substrate，每次最前置）

判定模式前先确保项目自带基础 skill。读 `.harness/ensure-base-skills.mjs` 与 `.harness/progress.md` 是否存在，分三态：

1. **脚本存在**（正常续跑 / 已 bootstrap 项目）→ `node .harness/ensure-base-skills.mjs`（幂等：遍历 `.harness/base-skills.json`，缺的 skill 从 `.harness/base-skills/<source>/` 复制到 `.claude/skills/<name>/`，在场的跳过）。
2. **脚本不存在 且 progress.md 不存在**（fresh 首调）→ 静默跳过本前置（`.harness/` 尚未生成是正常的）；首装交给 P1 末尾的 ensure。
3. **脚本不存在 但 progress.md 存在**（老项目，P1 早于本特性搭建过）→ 同 preflight/map 缺失：提示「基础层机械缺失，建议重跑 P1 幂等补全」，补完续行。

- 缺失的基础 skill → 从 `.harness/base-skills/` 复制到 `.claude/skills/`。
- 在场 → 跳过（不碰用户定制/旧版）。
- 连续（`all`）模式只在循环外跑一次（幂等，无需每轮）。

> 基础 skill 是 substrate，**不计 progress.md 能力 checkbox**；清单与脚本由 P1 落到 `.harness/`（见 Step 2 P1 专属）。
```

- [ ] **Step 3b: 扩展 P1 产物表行**

在 `SKILL.md` 能力清单表中，把 P1 行：

```
| P1  | 骨架     | CLAUDE.md + AGENTS.md + .harness/L0/{ai-behavior,project-context}.md + .harness/progress.md + .harness/preflight-profile.mjs + .harness/capability-field-map.json           |
```

替换为：

```
| P1  | 骨架     | CLAUDE.md + AGENTS.md + .harness/L0/{ai-behavior,project-context}.md + .harness/progress.md + .harness/preflight-profile.mjs + .harness/capability-field-map.json + .harness/base-skills.json + .harness/ensure-base-skills.mjs + .harness/base-skills/smart-advisor/（→ 经 ensure 落 .claude/skills/smart-advisor/）           |
```

- [ ] **Step 3c: 扩展 Step 2 P1 专属**

在 `SKILL.md` §执行流程 Step 2 中，把：

```
**P1 专属**：额外把静态文件 `preflight-profile.mjs` + `capability-field-map.json`（无 `{{VAR}}`）从 `assets/templates/harness/` **原样复制**到 `.harness/`。
```

替换为：

```
**P1 专属**：额外把静态文件 `preflight-profile.mjs` + `capability-field-map.json` + `base-skills.json` + `ensure-base-skills.mjs` + `base-skills/smart-advisor/`（均无 `{{VAR}}`）从 `assets/templates/harness/` **原样复制**到 `.harness/`；复制完成后跑一次 `node .harness/ensure-base-skills.mjs` → 首搭即落 `.claude/skills/smart-advisor/`。
```

- [ ] **Step 3d: 边界与失败模式表加 3 行**

在 `SKILL.md` `## 边界与失败模式` 的表格末尾（`| **preflight/map 缺失** ...` 行之后）追加 3 行：

```markdown
| **`.claude/skills/smart-advisor/` 已存在** | ensure 跳过（不碰，尊重定制/旧版）；要刷新需用户手动删除后重跑。 |
| **老项目缺 `.harness/ensure-base-skills.mjs` 或 `base-skills.json`** | 同 preflight/map 缺失：Step 0 前置检测到 → 提示按 P1 幂等补全（补清单+脚本+payload），补完续行。 |
| **`.harness/base-skills/smart-advisor/` payload 缺失** | ensure 非致命告警（不阻塞其它 P 步骤，退出码 0），提示重跑 P1。 |
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test assets/tests/templates/skill-md.test.mjs`
Expected: PASS（既有 12 条 + 新增 5 条 = 17 条）。

- [ ] **Step 5: 提交**

```bash
git add SKILL.md assets/tests/templates/skill-md.test.mjs
git commit -m "feat(skill): 接入 Step 0 前置基础 skill 层确保 + P1 落机械 + 边界场景"
```

---

## Task 4: 全量回归 + 收尾

- [ ] **Step 1: 跑全量测试套件**

Run: `node --test $(git ls-files 'assets/tests/**/*.test.mjs')`
Expected: 全部 PASS（含原有 hooks/templates/scripts 用例 + 本计划新增 2 个测试文件 + skill-md 追加 5 条）。

- [ ] **Step 2: 交叉一致性自检**

手动核验（人工 checkpoint，非脚本）：
- `base-skills.json` 的 `source`（`base-skills/smart-advisor`）解析到存在的目录 `assets/templates/harness/base-skills/smart-advisor/`（Task 1 测试已覆盖；确认无遗漏）。
- `SKILL.md` Step 0 前置 / P1 末尾引用的命令 `node .harness/ensure-base-skills.mjs` 与脚本用法一致（无必填参数；可选 `--project <dir>`）。
- vendor 的 smart-advisor `SKILL.md` frontmatter `name: smart-advisor` 与清单 `name: smart-advisor` 一致（Task 1 测试已覆盖）。
- ensure 脚本读 `projectDir/.harness/`（非脚本自身位置）——确认 shipped 到目标 `.harness/` 后能正确指向同级清单/payload。

- [ ] **Step 3: 提交收尾**

```bash
git add -A
git commit -m "test: 全量回归通过（smart-advisor 基础 skill 自动分发: vendor + 清单 + ensure + SKILL 接入）"
git log --oneline -6
```

---

## 验收标准（对照 spec §9）

1. **fresh 首搭**：空/新项目首调 → P1 落 `.harness/` 基础层机械 + 末尾跑 ensure → `.claude/skills/smart-advisor/` 生成。✦ Task 2 的「缺失→复制」断言锁定该行为。
2. **老项目补全**：已 bootstrap（无机械）的项目调用 → Step 0 前置三态检测 → 提示 P1 幂等补全。✦ Task 3 的「三态逻辑」断言 + SKILL 边界行锁定。
3. **纯幂等**：在场时 ensure no-op，内容逐字节不变。✦ Task 2 的「在场→不碰」「幂等」断言锁定。
4. **自主重装**：用户删除后调用 → ensure 从 `.harness/base-skills/` 补回。✦ Task 2 的「缺失→复制」断言锁定。
5. **可扩展**：清单 `skills` 加一项 + 放对应 payload → ensure 自动覆盖，无需改脚本/SKILL。✦ Task 1/2 设计天然支持。
6. **机械保证**：`node --test` 全绿；`skill-md.test.mjs` 锁住 Step 0 前置 + ensure 引用。✦ Task 4 Step 1。
7. **Guardrail 不破**：新产物均落 `.claude/` 或 `.harness/` 白名单内。✦ File Structure 表可核。

## 非目标

- 不新增 P 级能力（smart-advisor 是 substrate，不计 progress.md checkbox）。
- 不做版本戳 / 漂移检测 / sync 子命令（纯幂等 + vendor）。
- 不在 CLAUDE.md 自动引用 smart-advisor（可选润色，留作后续）。
- 不引入外部依赖（保持 `node:test` + Node 内置 `fs.cpSync`，需 Node ≥ 16.7）。

## 维护约定

smart-advisor 是外部演进 skill（作者 sisyphus，当前 version 1.0）。上游更新后需**手动重新 vendor**：把 `~/.claude/skills/smart-advisor/{SKILL.md, examples.md}` 覆盖回 `assets/templates/harness/base-skills/smart-advisor/` 并提交。已 bootstrap 的老项目不会自动刷新（纯幂等·在场即跳过）；需刷新则用户手动删除目标 `.claude/skills/smart-advisor/` 后重跑。
