---
name: harness-bootstrap
description: Use when 用户要为当前编程项目搭建/初始化 harness 配置（AI 编码纪律体系），需增量生成闸门/hooks/规则/文档骨架。覆盖任意技术栈的新项目（greenfield）与已有代码库（brownfield），通过 /harness-bootstrap 触发。
license: MIT
metadata:
  author: derived-from-cutog
  version: "1.1"
---

为当前项目增量搭建 harness 配置。**每次调用推进一个能力**（P1→P8），跨会话断点续传。

---

## 语言规则

交流用中文；产物中代码命名/路径/技术术语保持英文。

---

## 核心机制

**能力清单 P1-P8**（推荐序，可调）：

| P   | 能力     | 产物                                                                                                  |
| --- | -------- | ----------------------------------------------------------------------------------------------------- |
| P1  | 骨架     | CLAUDE.md + AGENTS.md + .harness/L0/{ai-behavior,project-context}.md + .harness/progress.md + .harness/preflight-profile.mjs + .harness/capability-field-map.json + .harness/base-skills.json + .harness/ensure-base-skills.mjs + .harness/base-skills/smart-advisor/（→ 经 ensure 落 .claude/skills/smart-advisor/）           |
| P2  | 文档结构 | docs/DOCS_INDEX.md + docs/README.md + docs/superpowers/specs/.gitkeep                                 |
| P3  | 闸门     | .harness/gates/\*.md + 闸门索引                                                                       |
| P4  | Hooks    | .claude/settings.json + .harness/hooks/\*.mjs                                                         |
| P5  | 质量纪律 | .harness/rules/{bugfix-protocol,code-impact-review,refactoring-safety}.md + .harness/anti-patterns.md |
| P6  | 提交纪律 | .harness/rules/{auto-commit-workflow,commit-conventions}.md                                           |
| P7  | Agents   | .claude/agents/\*.md                                                                                  |
| P8  | OpenSpec | .claude/commands/opsx/\*.md + .harness/openspec/                                                      |

**断点续传**：状态存在 `.harness/progress.md`（结构见 `assets/progress-schema.md`）。

**模板/智能边界**：结构性内容从 `assets/templates/` 复制 + 替换 `{{VAR}}`；项目特定内容按画像智能生成。详见各模板内的 `<!-- INTELLIGENT-FILL -->` 标注。

---

## 执行流程（每次 `/harness-bootstrap [可选 P{n}|all]`）

### Step 0 前置：基础 skill 层确保（substrate，每次最前置）

判定模式前先确保项目自带基础 skill。读 `.harness/ensure-base-skills.mjs` 与 `.harness/progress.md` 是否存在，分三态：

1. **脚本存在**（正常续跑 / 已 bootstrap 项目）→ `node .harness/ensure-base-skills.mjs`（幂等：遍历 `.harness/base-skills.json`，缺的 skill 从 `.harness/base-skills/<source>/` 复制到 `.claude/skills/<name>/`，在场的跳过）。
2. **脚本不存在 且 progress.md 不存在**（fresh 首调）→ 静默跳过本前置（`.harness/` 尚未生成是正常的）；首装交给 P1 末尾的 ensure。
3. **脚本不存在 但 progress.md 存在**（老项目，P1 早于本特性搭建过）→ 同 preflight/map 缺失：提示「基础层机械缺失，建议重跑 P1 幂等补全」，补完续行。

- 缺失的基础 skill → 从 `.harness/base-skills/` 复制到 `.claude/skills/`。
- 在场 → 跳过（不碰用户定制/旧版）。
- 连续（`all`）模式只在循环外跑一次（幂等，无需每轮）。

> 基础 skill 是 substrate，**不计 progress.md 能力 checkbox**；清单与脚本由 P1 落到 `.harness/`（见 Step 2 P1 专属）。

### Step 0: 判定模式

读 `.harness/progress.md`：

- **不存在** → 首次，执行 §首次判定，搭 P1 骨架，建 progress.md，结束本次。
- **存在**：
  - 参数为 `all` → **连续模式**：从第一个 `[ ]` 起，循环执行 Step 1-6 直到全部完成或遇到需用户决策的阻塞点。Step 1 改为「汇总展示剩余能力清单 + 一次性确认」，确认后连续推进，遇产物已存在则按幂等规则跳过。**连续模式每轮搭建前 MUST 先过 Step 0.5 preflight**（遇 block 单点暂停补问，补完续跑）。
  - 否则 → 解析目标能力（第一个 `[ ]` 或用户指定的 P{n}），进入 Step 1（单步）。

### Step 0.5: 画像装配 preflight（每次必跑，含连续模式每轮）

Step 0 解析出目标能力后、Step 1 之前，跑机械校验（机械牙齿，不靠记忆）：

```
node .harness/preflight-profile.mjs <目标 P{n}|all>
```

- **退出码 0**（ready）→ 进入 Step 1。
- **退出码 1**（BLOCK）→ 末行 JSON `{ready:false, missing:[...]}` 列出未决字段。按 §增量追问逐项补到 `.harness/project-definition.md`（选项型用 AskUserQuestion ≤4 选项+Other；开放型用普通对话），**回写后再跑 preflight 直到 0**，方可进入 Step 1。
- **连续（`all`）模式**：每轮搭建前都跑 preflight；遇 block 即在该能力处暂停补问，补完继续——不跳过、不臆测。也可先跑 `preflight … all` 一次性批量预问，减少逐轮打断。
- **`.harness/project-definition.md` 不存在** → 视为首次，走 §首次判定搭 P1（P1 无追问依赖，preflight 放行）。

> preflight 与依赖图（`capability-field-map.json`）均在 P1 生成到 `.harness/`。断点续传跨会话都能复跑校验。

### Step 1: 确认目标能力

向用户展示「将搭建 P{n}：{产物清单}」，AskUserQuestion 获确认。

### Step 2: 模板骨架

读取 `assets/templates/` 下对应模板 → 替换 `{{VAR}}`（用项目画像）→ Write 到目标位置。
**Write 前必须检查目标存在性**（见 Guardrails 幂等规则）。
**P1 专属**：额外把静态文件 `preflight-profile.mjs` + `capability-field-map.json` + `base-skills.json` + `ensure-base-skills.mjs` + `base-skills/smart-advisor/`（均无 `{{VAR}}`）从 `assets/templates/harness/` **原样复制**到 `.harness/`；复制完成后跑一次 `node .harness/ensure-base-skills.mjs` → 首搭即落 `.claude/skills/smart-advisor/`。

### Step 3: 智能填充

模板内 `<!-- INTELLIGENT-FILL -->` 标注的区域，按项目画像生成内容。

### Step 4: 引用完整性检查

验证入口文件 ↔ .harness/ 引用闭合（CLAUDE.md 引用的 .harness/L0/ 路径真实存在；闸门索引引用的 gate 文件存在）。**跨能力引用也要闭合**：如 P4 的 hook 引用了 P3 的 gate 文件，则跳序搭建时需检测目标是否存在，缺失则降级（见 session-gate-reminder 的 gates 未就绪分支）。

**L0 宪法层硬规则**：`.harness/L0/ai-behavior.md` 与 `project-context.md` 的对外引用必须是**条件引用**（标注「Px 生成」+ 内联降级），禁止指向尚未生成文件的必需硬引用——L0 必须在 P1 阶段就**自包含**可工作。

### Step 5: 更新 progress.md

勾选完成能力 + 写 updated 日期 + 产物摘要。

### Step 6: 输出

摘要 + 下一步建议（「下次调用将搭 P{n+1}」；连续模式下继续推进直至完成或阻塞）。

---

## 首次判定（greenfield / brownfield）

扫描项目根判定模式：

| 信号                                                                | greenfield | brownfield |
| ------------------------------------------------------------------- | ---------- | ---------- |
| `.git` 存在且有提交                                                 | 否         | 是         |
| 存在源码或 package.json/Cargo.toml/go.mod/pyproject.toml/pom.xml 等 | 否         | 是         |

**greenfield**：执行**首轮项目定义问答**（见 §首轮问答），生成 `.harness/project-definition.md`（画像权威源）→ 搭 P1。

**brownfield**：执行项目画像 audit（按下表自动识别，能自动得到的不问用户）：

| 识别特征     | 识别方式                                   | 影响                                               |
| ------------ | ------------------------------------------ | -------------------------------------------------- |
| 主语言/框架  | 扫 manifest 文件                           | P4 auto-check、P7 agents、project-context 技术栈段 |
| 测试工具     | manifest + test 目录                       | P4 auto-check、P3 G7 验证命令                      |
| 格式化/lint  | 扫 .\*rc 配置                              | P4 auto-format、避免重复配置                       |
| 已有约定文件 | 扫 .editorconfig/CONTRIBUTING.md/README.md | project-context 引用、冲突规避                     |
| 跨平台需求   | 扫 tauri/electron/qt 依赖                  | 是否生成条件闸门「平台规则」                       |
| UI/设计系统  | 扫 tailwind.config/token 目录              | 是否生成条件闸门「UI 设计确认」「设计规范同步」    |
| 项目规模     | 文件数 + git 提交数 + 目录深度             | 治理档位建议                                       |
| 单人/团队    | git remote/CODEOWNERS/CI                   | P6 提交纪律协作严格度                              |

画像写入 `.harness/project-definition.md`（progress.md 仅存指针）。brownfield audit 结果同样写入该文件。

**brownfield audit → manifest 键映射**：audit 命中结果按下表写入 `.harness/project-definition.md` 对应字段（替换 `<待…>`，不重复追问）：主语言/框架 → `primary_language`；格式化/lint → `lint_config`；技术栈细化（版本/运行时）→ `tech_stack_detail`；单人/团队 → `collab_mode`。

**判定兜底**：两个信号均为否（无 `.git` 提交、无源码/manifest）→ **greenfield**。

---

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

> **权威源**：`.harness/capability-field-map.json`（preflight 脚本据此校验）。下表为镜像，如有出入以 JSON 为准。
> 追问流程已并入 **Step 0.5 preflight**：preflight 报 block → 按下表所需字段追问 → 回写 → 复跑 preflight。

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

## 边界与失败模式

| 场景 | 行为 |
|------|------|
| **跳序直搭**（`/harness-bootstrap P7`）| Step 0.5 preflight 按 P7 依赖图拦截；缺啥问啥，回写后复跑，不硬搭。 |
| **greenfield 未 scaffold 就到 P7** | `tech_stack_detail` 标 `<待 scaffold 后回填>`，preflight 报 block → 暂停，提示用户先 scaffold 或手填意向版本。 |
| **连续模式遇 `<待…>`** | Step 0.5 单点暂停补问，补完续跑；不跳过、不臆测。 |
| **画像被损坏** | 走 progress-schema 画像容错条款：git 反推 + 逐字段确认，不臆测。 |
| **preflight/map 缺失** | 提示重新生成 P1（P1 负责落 preflight + map 到 `.harness/`）。 |
| **`.claude/skills/smart-advisor/` 已存在** | ensure 跳过（不碰，尊重定制/旧版）；要刷新需用户手动删除后重跑。 |
| **老项目缺 `.harness/ensure-base-skills.mjs` 或 `base-skills.json`** | 同 preflight/map 缺失：Step 0 前置检测到 → 提示按 P1 幂等补全（补清单+脚本+payload），补完续行。 |
| **`.harness/base-skills/smart-advisor/` payload 缺失** | ensure 非致命告警（不阻塞其它 P 步骤，退出码 0），提示重跑 P1。 |

---
## Guardrails（铁律）

- **禁止**产物溢出 5 处根级位置（CLAUDE.md/AGENTS.md/.claude/.harness/docs）之外。
- **禁止**brownfield 模式破坏现有文件：Write 前检查目标，已有非 harness 文件不动，已有 CLAUDE.md 提示合并。
- **禁止**假设无法识别的技术栈：列候选问用户。
- **禁止**跳过 progress.md 更新（断点续传依赖它）。
- **禁止**重复执行已存在能力而不提示：检测到产物已存在 → 三选一（跳过/覆盖/差异对比），默认跳过。
- **必须**每次调用只推进一个能力（除非用户显式要求连续，如 `/harness-bootstrap all`）。
- **必须**brownfield「代码库先行」：能自动识别的不问用户。
- **必须**引用完整性检查通过后才更新 progress。

---

## 输入

- `/harness-bootstrap`：推进下一个能力（默认，单步）。
- `/harness-bootstrap P{n}`：跳到指定能力。
- `/harness-bootstrap all`：连续搭建所有剩余能力（用户显式授权批量；每能力仍走 Step 1-6，但 Step 1 改为一次性汇总确认后连续推进，遇产物已存在则按幂等规则跳过）。
