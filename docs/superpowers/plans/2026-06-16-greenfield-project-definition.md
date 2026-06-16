# greenfield 项目定义问答机制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 harness-bootstrap skill 增加 greenfield 场景的「项目定义问答」机制（首轮 5 问 + 映射表驱动增量追问），并把 L0 宪法层重构为自包含（不依赖尚未生成的文件）。

**Architecture:** 新增画像权威源 `project-definition.md` 作为所有能力智能填充与追问读写的唯一来源。L0 宪法层（ai-behavior.md）内联闸门速查，对外文件引用全部条件化（标注「Px 生成；未生成遵循内联」）。改动是模板（.tmpl）+ 文档（SKILL.md / progress-schema.md），验证用 `node:test` 写**模板结构断言测试**（读取模板文件断言关键结构），最终回归全量测试套件。

**Tech Stack:** Node.js `node:test` + `node:assert`；纯文本模板（Markdown + `{{VAR}}` 占位符）。

**项目背景（给零上下文的执行者）:**
- 这是 `harness-bootstrap` 自建 Claude Code skill，位于 `E:\project\harness-bootstrap`。
- 测试惯例：`node --test assets/tests/hooks/*.test.mjs`（glob 由 shell 扩展）；现有 60 个 hooks 测试全部通过。
- 模板放在 `assets/templates/`，SKILL 运行时复制 + 替换 `{{VAR}}` 到用户项目的 `.harness/`。
- **当前非 git 仓库**：各任务末尾的「commit」步骤以「运行该任务测试确认通过」替代（验证检查点）。

**spec 对照**：本计划实现 `docs/superpowers/specs/2026-06-16-greenfield-project-definition-design.md`。spec §8 措辞「§3/§5」为笔误，实际 `ai-behavior.md.tmpl` 为 §1–§4，文件引用位于 §1/§2/§3（见 Task 2）。

---

## File Structure

| 文件 | 操作 | 责任 |
|------|------|------|
| `assets/templates/harness/project-definition.md.tmpl` | **新建** | greenfield 画像权威源模板（frontmatter + 首轮段 + 追问累积段）|
| `assets/tests/templates/project-definition.test.mjs` | **新建** | 断言画像模板结构（占位符、三段、`<待…>` 标记）|
| `assets/tests/templates/ai-behavior.test.mjs` | **新建** | 断言 L0 自包含（内联速查 + 条件引用 + 无悬空必需引用）|
| `assets/tests/templates/project-context.test.mjs` | **新建** | 断言 project-context 引用画像源 + 未定项标注 |
| `assets/tests/templates/progress-schema.test.mjs` | **新建** | 断言画像段改为指针（不再内联 `{{PROJECT_PROFILE}}`）|
| `assets/tests/templates/skill-md.test.mjs` | **新建** | 断言 SKILL.md 含首轮问答 / 增量追问 / 映射表 / 判定兜底 / Step 4 硬规则 |
| `assets/templates/harness/L0/ai-behavior.md.tmpl` | **修改** | §2 内联闸门速查；§1/§2/§3 + 顶部引用条件化 |
| `assets/templates/harness/L0/project-context.md.tmpl` | **修改** | 标注画像来源 = project-definition.md；未定项标注 |
| `assets/progress-schema.md` | **修改** | 画像段内联 → 指针 |
| `SKILL.md` | **修改** | greenfield 首次分支重写 + 首轮问答小节 + 增量追问 + 映射表 + Step 4 硬规则 + 判定兜底 |

---

## Task 1: 新建画像权威源模板 project-definition.md.tmpl

**Files:**
- Create: `assets/templates/harness/project-definition.md.tmpl`
- Test: `assets/tests/templates/project-definition.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/project-definition.test.mjs`:

```js
#!/usr/bin/env node
// 测试 project-definition.md.tmpl（画像权威源）结构
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

test("模板存在且非空", () => {
  assert.ok(tmpl.length > 0);
});

test("frontmatter 含 project_name/mode/updated", () => {
  assert.match(tmpl, /project_name:\s*\{\{PROJECT_NAME\}\}/);
  assert.match(tmpl, /mode:\s*greenfield/);
  assert.match(tmpl, /updated:\s*\{\{DATE\}\}/);
});

test("首轮必答段含定位/技术栈意向/应用类型", () => {
  assert.match(tmpl, /定位:\s*\{\{OVERVIEW\}\}/);
  assert.match(tmpl, /技术栈意向:\s*\{\{TECH_STACK_INTENT\}\}/);
  assert.match(tmpl, /应用类型:\s*\{\{APP_TYPE\}\}/);
});

test("首轮选答段含硬约束（可空）", () => {
  assert.match(tmpl, /硬约束:\s*\{\{HARD_CONSTRAINTS\}\}/);
});

test("追问累积段含三个 <待…> 缺失标记", () => {
  assert.match(tmpl, /协作模式.*<待[^>]*P6/s);
  assert.match(tmpl, /lint[^]*<待[^>]*P5/s);
  assert.match(tmpl, /技术栈细化[^]*<待[^>]*P7/s);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test assets/tests/templates/project-definition.test.mjs`
Expected: FAIL — `ENOENT: no such file ... project-definition.md.tmpl`（模板尚未创建）

- [ ] **Step 3: 创建模板**

Create `assets/templates/harness/project-definition.md.tmpl`:

```markdown
---
project_name: {{PROJECT_NAME}}
mode: greenfield
updated: {{DATE}}
---

# 项目定义（画像权威源）

> 本文件是 greenfield 首轮问答 + 增量追问累积的**唯一画像来源**。
> 所有能力的智能填充、所有追问的读写，都经过本文件。
> `progress.md` 仅存指针指向本文件，不内联画像内容。

## 首轮（必答）
- 定位: {{OVERVIEW}}
- 技术栈意向: {{TECH_STACK_INTENT}}
- 应用类型: {{APP_TYPE}}

## 首轮（选答）
- 硬约束: {{HARD_CONSTRAINTS}}（无则填「无」）

## 追问累积（按能力映射表触发，未答项标 <待 X 前追问>）
- 协作模式: <待 P6 前追问>
- lint/格式化配置: <待 P5 前追问>
- 技术栈细化(版本/运行时): <待 P7 前追问，或用户已 scaffold 后回填>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `node --test assets/tests/templates/project-definition.test.mjs`
Expected: PASS（6 tests）

- [ ] **Step 5: 验证检查点（非 git：跳过 commit，测试通过即为节点完成）**

Run: `node --test assets/tests/templates/project-definition.test.mjs`
Expected: 全部 PASS。

---

## Task 2: L0 自包含重构 — ai-behavior.md.tmpl

**Files:**
- Modify: `assets/templates/harness/L0/ai-behavior.md.tmpl`
- Test: `assets/tests/templates/ai-behavior.test.mjs`

**说明**：spec §8「§3/§5」为笔误。实际该模板为 §1–§4，对外文件引用在：§1（`code-impact-review.md`）、§2（`gates/index.md`）、§3（`auto-commit-workflow.md`）。本任务内联 §2 闸门速查，并将三处引用 + 顶部 blockquote 全部条件化。

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/ai-behavior.test.mjs`:

```js
#!/usr/bin/env node
// 测试 ai-behavior.md.tmpl L0 自包含性
// 运行: node --test assets/tests/templates/ai-behavior.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = join(__dirname, "..", "..", "templates");
const tmpl = readFileSync(
  join(TEMPLATES, "harness", "L0", "ai-behavior.md.tmpl"),
  "utf8",
);

test("§2 内联闸门速查含 G1→G7 主链", () => {
  assert.match(tmpl, /G1[^]*G2[^]*G3[^]*G4[^]*G5[^]*G7/s);
});

test("§2 内联速查覆盖 G8-G12", () => {
  for (const g of ["G8", "G9", "G10", "G11", "G12"]) {
    assert.ok(tmpl.includes(g), `应包含 ${g}`);
  }
});

test("gates/index.md 引用标注 P3 生成 + 未生成降级", () => {
  assert.match(tmpl, /gates\/index\.md/);
  assert.match(tmpl, /P3\s*生成/s);
  assert.match(tmpl, /未生成/s);
});

test("code-impact-review.md 引用标注 P5 生成", () => {
  assert.match(tmpl, /code-impact-review\.md/);
  assert.match(tmpl, /P5\s*生成/s);
});

test("auto-commit-workflow.md 引用标注 P6 生成", () => {
  assert.match(tmpl, /auto-commit-workflow\.md/);
  assert.match(tmpl, /P6\s*生成/s);
});

test("无悬空必需引用：顶部声明规则文件为可选增强", () => {
  // gates(P3)/rules(P5,P6) 应被声明为「按条件生成」，L0 自带核心原则
  assert.match(tmpl, /P3\s*生成/s);
  assert.match(tmpl, /P5.*P6|P6.*P5/s);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test assets/tests/templates/ai-behavior.test.mjs`
Expected: FAIL — §2 当前仅引用 `gates/index.md` 无内联速查，且无「P3 生成」标注。

- [ ] **Step 3: 修改顶部 blockquote（声明规则文件为条件增强）**

In `assets/templates/harness/L0/ai-behavior.md.tmpl`, replace:

```
> 始终加载本文件和 `.harness/L0/project-context.md`（L0-P 宪法层）。
> 闸门定义在 `.harness/gates/`，规则在 `.harness/rules/`，按触发条件加载。
```

with:

```
> 始终加载本文件和 `.harness/L0/project-context.md`（L0-P 宪法层）。两者构成 L0 宪法层，**自包含可工作**。
> 闸门（`.harness/gates/`，P3 生成）、规则（`.harness/rules/`，P5/P6 生成）是**增强**：未生成时遵循本文件内联的核心原则，生成后提供更详细的触发时机/豁免。
```

- [ ] **Step 4: 修改 §1 第 5 条（条件化 code-impact-review.md 引用）**

Replace:

```
5. **无阅读不修改**：修改已有函数前，先完成三次阅读（目标/调用方/被调用），见 `.harness/rules/code-impact-review.md`。
```

with:

```
5. **无阅读不修改**：修改已有函数前，先完成三次阅读（目标/调用方/被调用）。详细清单见 `.harness/rules/code-impact-review.md`（由 **P5 生成**；未生成时遵循本条三次阅读原则）。
```

- [ ] **Step 5: 重写 §2 闸门索引（内联速查 + 条件引用）**

Replace the entire current §2 block:

```
## §2 闸门索引

**闸门不可跳过**。修改已有代码按 `.harness/gates/index.md` 的顺序执行。

完整闸门清单与触发时机见 `.harness/gates/index.md`（由 P3 能力生成）。当前搭建状态见 `.harness/progress.md`。
```

with:

```
## §2 闸门索引

**闸门不可跳过**。修改已有代码按下表顺序执行。

| #   | 闸门              | 触发时机                          |
| --- | ----------------- | --------------------------------- |
| G1  | 需求清晰度        | propose / apply / 计划前          |
| G2  | 实施计划质量      | 产出 plan / tasks 前              |
| G3  | Plan-to-Apply 检查站 | G2 通过后、apply 前            |
| G4  | 影响评估          | 修改已有代码前                    |
| G5  | 代码影响深度审查  | 修改已有函数前                    |
| G6  | 架构延续          | 任何代码 / 文档变更（全程伴随）   |
| G7  | 实施执行质量      | apply 阶段                        |
| G8  | 重构安全          | 状态迁移 / 事件链路 / 盒模型重构  |
| G9  | BugFix 验证       | 每次 bug fix                      |
| G10 | 重复修复升级      | 同一 bug 第 2 次失败              |
| G11 | Harness 治理      | 改 `.harness/` 治理文件 / 入口文件 |
| G12 | Hook 反馈闭环     | hook 反馈 / 闸门不通过            |

典型顺序：G1 → G2 → G3 → G4 → G5 → G7（G6 全程伴随；G8/G9/G10 按需；改治理文件加 G11；hook 反馈触发 G12）。

详细触发时机、豁免条件、条件闸门（UI/平台/设计系统）见 `.harness/gates/index.md`（由 **P3 生成**；**未生成时遵循本节速查**）。当前搭建状态见 `.harness/progress.md`。
```

- [ ] **Step 6: 修改 §3（条件化 auto-commit-workflow.md 引用）**

Replace:

```
详见 `.harness/rules/auto-commit-workflow.md`（由 P6 能力生成）。核心：
```

with:

```
详见 `.harness/rules/auto-commit-workflow.md`（由 **P6 生成**；未生成时遵循下列核心）。核心：
```

- [ ] **Step 7: 运行测试确认通过**

Run: `node --test assets/tests/templates/ai-behavior.test.mjs`
Expected: PASS（6 tests）

- [ ] **Step 8: 验证检查点（测试通过即完成）**

Run: `node --test assets/tests/templates/ai-behavior.test.mjs`
Expected: 全部 PASS。

---

## Task 3: project-context.md.tmpl 标注画像来源

**Files:**
- Modify: `assets/templates/harness/L0/project-context.md.tmpl`
- Test: `assets/tests/templates/project-context.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/project-context.test.mjs`:

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test assets/tests/templates/project-context.test.mjs`
Expected: FAIL — 当前模板无 `project-definition.md` 引用，无「待…scaffold/追问/补」标注。

- [ ] **Step 3: 在顶部 blockquote 后插入画像来源声明**

In `assets/templates/harness/L0/project-context.md.tmpl`, replace:

```
> 与 `.harness/L0/ai-behavior.md`（L0-A）共同构成 L0 宪法层。
```

with:

```
> 与 `.harness/L0/ai-behavior.md`（L0-A）共同构成 L0 宪法层。
>
> **画像来源**：`.harness/project-definition.md`（greenfield 首轮问答 + 增量追问累积的权威源）。本文件由 P1 从画像生成；画像中尚未确定的项标注「待 scaffold / 追问后补」，项目 scaffold 后回填。
```

- [ ] **Step 4: 增强 §1 的 INTELLIGENT-FILL 注释（标注未定项）**

Replace:

```
<!-- INTELLIGENT-FILL: 一句话项目定位 + 目标用户 + 核心场景。greenfield 用问答结果；brownfield 从 README/manifest 推断后让用户确认。 -->
```

with:

```
<!-- INTELLIGENT-FILL: 一句话定位来自 .harness/project-definition.md 首轮问答；应用类型/技术栈意向同源。greenfield 未 scaffold 时项目结构为意向，标「待 scaffold 后补」。brownfield 从 README/manifest 推断后让用户确认。 -->
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test assets/tests/templates/project-context.test.mjs`
Expected: PASS（3 tests）

- [ ] **Step 6: 验证检查点（测试通过即完成）**

Run: `node --test assets/tests/templates/project-context.test.mjs`
Expected: 全部 PASS。

---

## Task 4: progress-schema.md 画像段改指针

**Files:**
- Modify: `assets/progress-schema.md`
- Test: `assets/tests/templates/progress-schema.test.mjs`

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/progress-schema.test.mjs`:

```js
#!/usr/bin/env node
// 测试 progress-schema.md 画像段改为指针
// 运行: node --test assets/tests/templates/progress-schema.test.mjs

import { test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpl = readFileSync(
  join(__dirname, "..", "..", "progress-schema.md"),
  "utf8",
);

test("画像段引用 project-definition.md 作为权威源", () => {
  assert.match(tmpl, /project-definition\.md/);
});

test("不再内联 {{PROJECT_PROFILE}} 占位符", () => {
  assert.doesNotMatch(tmpl, /\{\{PROJECT_PROFILE\}\}/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test assets/tests/templates/progress-schema.test.mjs`
Expected: FAIL — 当前模板含 `{{PROJECT_PROFILE}}` 且无 `project-definition.md` 引用。

- [ ] **Step 3: 修改模板内的画像段**

In `assets/progress-schema.md`, replace the block:

```
## 项目画像（brownfield audit 结果；greenfield 填问答结果）
{{PROJECT_PROFILE}}
```

with:

```
## 项目画像
画像权威源：`.harness/project-definition.md`（greenfield 首轮问答 + 增量追问累积；brownfield audit 结果同样写入该文件）。本 progress.md 不内联画像内容，仅指针引用。
```

- [ ] **Step 4: 更新「画像维护」语义说明**

In `assets/progress-schema.md`, replace:

```
- **画像维护**：brownfield audit 或 greenfield 问答结果写入「项目画像」段，供后续能力的智能填充引用。
```

with:

```
- **画像维护**：brownfield audit 或 greenfield 问答结果写入 `.harness/project-definition.md`（画像权威源），供后续能力智能填充引用；progress.md「项目画像」段仅存指针，不内联内容。
```

- [ ] **Step 5: 运行测试确认通过**

Run: `node --test assets/tests/templates/progress-schema.test.mjs`
Expected: PASS（2 tests）

- [ ] **Step 6: 验证检查点（测试通过即完成）**

Run: `node --test assets/tests/templates/progress-schema.test.mjs`
Expected: 全部 PASS。

---

## Task 5: SKILL.md 主流程重写

**Files:**
- Modify: `SKILL.md`
- Test: `assets/tests/templates/skill-md.test.mjs`

**改动点**：① 首次判定 greenfield 行 → 首轮问答；② 画像落地行 → project-definition.md；③ 新增「首轮问答」+「增量追问」两小节（含映射表）；④ Step 4 加 L0 条件引用硬规则；⑤ 判定表加兜底。

- [ ] **Step 1: 写失败测试**

Create `assets/tests/templates/skill-md.test.mjs`:

```js
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `node --test assets/tests/templates/skill-md.test.mjs`
Expected: FAIL — 当前 SKILL.md 无「首轮问答」「增量追问」「判定兜底」「条件引用」「自包含」等关键结构。

- [ ] **Step 3: 修改 greenfield 首次分支行**

In `SKILL.md`, replace:

```
**greenfield**：AskUserQuestion 收集（一句话定位 + 技术栈意向）→ 生成画像 → 搭 P1。
```

with:

```
**greenfield**：执行**首轮项目定义问答**（见 §首轮问答），生成 `.harness/project-definition.md`（画像权威源）→ 搭 P1。
```

- [ ] **Step 4: 修改画像落地行**

In `SKILL.md`, replace:

```
画像写入 progress.md 的「项目画像」段。
```

with:

```
画像写入 `.harness/project-definition.md`（progress.md 仅存指针）。brownfield audit 结果同样写入该文件。
```

- [ ] **Step 5: 在判定表后加兜底说明**

In `SKILL.md`, immediately after the greenfield/brownfield judgment table (the table with `.git 存在且有提交` row), the `**greenfield**`/`**brownfield**` lines, and before `---`, add. Find the line:

```
画像写入 `.harness/project-definition.md`（progress.md 仅存指针）。brownfield audit 结果同样写入该文件。
```

and append after it (before the next `---`):

```

**判定兜底**：两个信号均为否（无 `.git` 提交、无源码/manifest）→ **greenfield**。
```

- [ ] **Step 6: 在「首次判定」段之后、「Guardrails」段之前插入两小节**

In `SKILL.md`, insert these two sections as new `##` headings **between the 首次判定 section's closing `---` and `## Guardrails（铁律）`**. Each new section below is followed by its own `---` (so they render as independent sections). Content to insert (after the existing `---`, before `## Guardrails`):

```
## 首轮问答（greenfield 首次调用）

判定 greenfield 后，用**一条普通对话消息**一次性提出 5 项（编号列表），用户自由作答：

| # | 问题                                          | 必答     | 落地字段（project-definition.md）|
|---|-----------------------------------------------|----------|----------------------------------|
| 1 | 项目名                                        | 是       | `{{PROJECT_NAME}}`（所有产物占位符来源）|
| 2 | 一句话定位（是什么 / 给谁用 / 解决什么）      | 是       | `{{OVERVIEW}}`                   |
| 3 | 技术栈意向（主语言 + 框架）                   | 是       | `{{TECH_STACK_INTENT}}`          |
| 4 | 应用类型（Web / API / CLI / 库 / 桌面 / 移动）| 是       | `{{APP_TYPE}}`                   |
| 5 | 已知硬约束（性能 / 安全 / 合规 / 平台）       | 否·可空  | `{{HARD_CONSTRAINTS}}`           |

技术栈意向 / 应用类型附候选清单供参考，仍允许自由填写。**不用 AskUserQuestion**（5 项含 3 个开放文本，AskUserQuestion 无法承载；且其单次上限 4 问 < 5 项）。问完即写 `.harness/project-definition.md`（frontmatter project_name/mode/updated + 首轮段 + 追问累积段），再搭 P1。

---

## 增量追问（按能力映射表驱动，每次搭建前）

搭每个能力前，读 `.harness/project-definition.md`，查下表所需字段；**缺失项（标 `<待…>`）未补全前不得搭建该能力**。选项型字段（如协作模式）可用 AskUserQuestion（≤4 选项 + Other）；开放型字段用普通对话。回写画像后再搭建。

| 能力     | 所需画像字段                         | 来源              | 追问 |
|----------|--------------------------------------|-------------------|------|
| P2 文档  | —                                    | 首轮              | 否   |
| P3 闸门  | 应用类型                             | 首轮已有          | 否   |
| P4 Hooks | —                                    | 通用              | 否   |
| P5 质量  | 主语言、lint/格式化配置、硬约束      | 首轮意向 + 选答   | **是**（lint 配置多半未定）|
| P6 提交  | 协作模式（单人 / 团队）              | 未填              | **是** |
| P7 Agents| 技术栈细化、应用类型、协作模式       | 多半未定          | **是** |
| P8 OpenSpec | —                                 | —                 | 否   |

---
```

- [ ] **Step 7: 在 Step 4 末尾加 L0 条件引用硬规则**

In `SKILL.md`, replace the Step 4 block:

```
### Step 4: 引用完整性检查

验证入口文件 ↔ .harness/ 引用闭合（CLAUDE.md 引用的 .harness/L0/ 路径真实存在；闸门索引引用的 gate 文件存在）。**跨能力引用也要闭合**：如 P4 的 hook 引用了 P3 的 gate 文件，则跳序搭建时需检测目标是否存在，缺失则降级（见 session-gate-reminder 的 gates 未就绪分支）。
```

with:

```
### Step 4: 引用完整性检查

验证入口文件 ↔ .harness/ 引用闭合（CLAUDE.md 引用的 .harness/L0/ 路径真实存在；闸门索引引用的 gate 文件存在）。**跨能力引用也要闭合**：如 P4 的 hook 引用了 P3 的 gate 文件，则跳序搭建时需检测目标是否存在，缺失则降级（见 session-gate-reminder 的 gates 未就绪分支）。

**L0 宪法层硬规则**：`.harness/L0/ai-behavior.md` 与 `project-context.md` 的对外引用必须是**条件引用**（标注「Px 生成」+ 内联降级），禁止指向尚未生成文件的必需硬引用——L0 必须在 P1 阶段就**自包含**可工作。
```

- [ ] **Step 8: 运行测试确认通过**

Run: `node --test assets/tests/templates/skill-md.test.mjs`
Expected: PASS（6 tests）

- [ ] **Step 9: 验证检查点（测试通过即完成）**

Run: `node --test assets/tests/templates/skill-md.test.mjs`
Expected: 全部 PASS。

---

## Task 6: 全量回归 + 占位符闭合验证

**Files:**
- Test: 运行现有 hooks 测试 + 新增 templates 测试，确保无回归。

- [ ] **Step 1: 运行全量测试套件**

Run:
```bash
node --test assets/tests/hooks/*.test.mjs assets/tests/templates/*.test.mjs
```
Expected: 全部 PASS（原 60 hooks 测试 + 新增 templates 测试，零失败）。

- [ ] **Step 2: 手动核对 spec §11 验收标准（对抗复测）**

人工检查（执行者读产物确认）：
1. **greenfield 首次**：SKILL.md「首轮问答」节描述了一次性问 5 项 → 写 project-definition.md → 搭 P1。
2. **占位符闭合**：project-definition.md.tmpl 的 frontmatter `project_name: {{PROJECT_NAME}}` 是 PROJECT_NAME 唯一来源；progress-schema.md 已不含 `{{PROJECT_PROFILE}}`。
3. **追问触发**：SKILL.md 映射表标 P5/P6/P7 追问=是，硬约束「缺失项未补全前不得搭建」。
4. **不重复问**：映射表 P3「应用类型 / 首轮已有 / 追问=否」。
5. **L0 自包含**：ai-behavior.md.tmpl §2 内联 G1–G12 速查，gates/rules 引用全部带「Px 生成；未生成遵循内联」。
6. **跨工具**：首轮用普通对话（非 AskUserQuestion），任何工具可执行。

- [ ] **Step 3: 最终验证检查点**

Run:
```bash
node --test assets/tests/hooks/*.test.mjs assets/tests/templates/*.test.mjs
```
Expected: 全部 PASS。若全绿，greenfield 项目定义问答机制实现完成。

---

## Self-Review 记录

**1. Spec 覆盖**：
- §3 决策（首轮 5 问/映射表/普通对话/project-definition.md）→ Task 1 + Task 5 ✓
- §4 数据流 → Task 5（首轮问答 + 增量追问小节）✓
- §5 首轮流程 → Task 5 Step 6 ✓
- §6 project-definition.md 模板 → Task 1 ✓
- §7 增量追问 + 映射表 → Task 5 Step 6 ✓
- §8 L0 自包含（笔误 §3/§5 已纠正为 §1/§2/§3）→ Task 2 ✓
- §9 落地清单（1 新增 + 4 修改）→ Task 1/2/3/4/5 ✓
- §10 缺陷修补 → 对应各 Task ✓
- §11 验收标准 → Task 6 Step 2 ✓

**2. 占位符扫描**：所有 step 含完整代码/文件内容；无 TBD/TODO；引用的变量（PROJECT_NAME/OVERVIEW/TECH_STACK_INTENT/APP_TYPE/HARD_CONSTRAINTS/DATE）均在 Task 1 模板定义。✓

**3. 类型一致性**：测试中的占位符名、字段名（定位/技术栈意向/应用类型/硬约束/协作模式）与实现内容、映射表一致。✓
