# Design: greenfield 项目定义问答机制

> 为 harness-bootstrap skill 设计 greenfield（空文件夹）场景下的「项目定义问答」机制。
> 状态：已通过 brainstorming 澄清 + 设计确认，待写实现计划。
> 日期：2026-06-16

---

## 1. 背景与动机

对抗型测试「在一个空文件夹调用此 skill」暴露了 greenfield 路径的四个结构性缺陷：

| # | 缺陷 | 危害 |
|---|------|------|
| 1 | `{{PROJECT_NAME}}` 占位符替换源未定义 | 空文件夹目录名往往无意义，产物标题可能叫 `# test` |
| 2 | greenfield 画像信息密度过低（仅"定位+技术栈意向"） | project-context 大量占位；后续 P5/P7 产出与技术栈错配 |
| 3 | L0 宪法层（ai-behavior.md）对后续能力产物（gates/rules）的「必需硬引用」 | P1 搭完、P3/P5/P6 未搭时，每次会话加载的 L0 指向一堆不存在的文件 |
| 4 | greenfield 的 AskUserQuestion 无硬约束 | agent 可能跳过提问、臆测画像，违反 G1 |

本设计用一个统一的「项目定义问答」机制一并解决以上四点。

---

## 2. 目标与非目标

**目标**
- 让 greenfield（空文件夹）首次调用能产出高质量、自洽的 P1 骨架。
- 让后续 P2–P8 搭建时，画像缺关键信息时**强制追问**（硬规则，非 agent 凭感觉）。
- 让 L0 宪法层在 P1 阶段就自包含可工作，不必需尚未生成的文件。

**非目标**
- 不改变 brownfield 路径（已有 audit 机制）。
- 不改变能力清单 P1–P8 的划分与产物范围。
- 不改变"产物只落 5 处根级位置"的铁律。

---

## 3. 设计决策（brainstorming 澄清结论）

| 决策点 | 选定 |
|--------|------|
| 作用范围 | **D** — 首轮最小启动 + 机制支持「按需增量追问」 |
| 首轮必答题 | 4 项：项目名 / 一句话定位 / 技术栈意向 / 应用类型 |
| 首轮选答题 | 1 项：已知硬约束（性能/安全/合规/平台，可空） |
| 追问触发方式 | **D** — 「能力 → 所需画像字段」映射表驱动 |
| 提问方式 | **修订**：首轮普通对话一次问 5 项 + 选项型追问用 AskUserQuestion（见下方工具约束） |
| 答案落地 | **B** — 单独文件 `.harness/project-definition.md` 作为画像权威源 |

> **工具约束（spec self-review 核实）**：Claude `AskUserQuestion` 每次调用 **1–4 个问题**，每问 **2–4 个选项**（可配 "Other" 接受自由文本），`header` ≤12 字符（[官方文档](https://code.claude.com/docs/en/agent-sdk/user-input)）。它**无法承载开放文本问题**（项目名/一句话定位/硬约束），且单次上限 4 问 < 首轮 5 项。
>
> 据此修订原方案 A（"AskUserQuestion 为主"）：**首轮以普通对话一条消息一次性承载全部 5 项**（开放文本天然适合，且跨工具一致）；AskUserQuestion 保留给后续**选项明确**的追问（如协作模式：单人/团队）。此修订需用户审查确认。

---

## 4. 机制总览与数据流

机制分两阶段，都围绕新增的画像权威源 `project-definition.md`：

```
阶段 1：首轮定义（greenfield 首次调用触发）
  判定 greenfield → 普通对话一次问 5 项 (4 必答 + 1 选答)
  → 写 project-definition.md (权威源)
  → 写 progress.md (mode=greenfield + 画像指针)
  → 搭 P1 (project-context.md 从画像生成，未定项标注"待补")

阶段 2：增量追问（映射表驱动，每次搭建某能力前）
  搭 Px 前 → 读 project-definition.md → 查「能力→字段」映射表
  → 有缺失字段? → 追问(选项型 AskUserQuestion / 开放型 对话) → 回写画像 → 继续 Px
```

**核心约束**：画像信息只存 `project-definition.md` 一处。所有产物生成、所有追问读写，都经过它，避免画像信息散落多处不同步。

---

## 5. 首轮问答流程

判定为 greenfield 后，用**一条普通对话消息**一次性提出 5 项（编号列表），用户自由作答。不强制使用 AskUserQuestion：5 项含 3 个开放文本问题（项目名/定位/硬约束），AskUserQuestion 无法承载，且单次上限 4 问 < 5 项（见 §3 工具约束）。技术栈意向/应用类型在消息中附候选清单供参考，但仍允许自由填写。

| # | 问题 | 类型 | 驱动的产物/能力 |
|---|------|------|----------------|
| 1 | 项目名 | 开放文本 | `{{PROJECT_NAME}}`（CLAUDE.md/AGENTS.md/project-context/progress 全部占位符）|
| 2 | 一句话定位（是什么 / 给谁用 / 解决什么）| 开放文本 | project-context §1 |
| 3 | 技术栈意向（主语言 + 框架）| 开放文本（附候选清单）| project-context §2/§4、P4 auto-check 探测、P5/P7 |
| 4 | 应用类型 | 开放文本（候选：Web/API/CLI/库/桌面/移动）| project-context §1、P3 是否生成 UI/平台条件闸门 |
| 5 | 已知硬约束（性能 / 安全 / 合规 / 平台限制）| 开放文本 · **选答可空** | project-context §5、P5、全画像 |

技术栈意向候选清单（供参考，用户可改或自由填）：
React+Node / Vue+Vite / Next.js / SvelteKit / 纯后端 Go API / 纯后端 Rust(Axum)/ Python(FastAPI) / Rust CLI / Go CLI / 其他（自由描述）。

问完即写 `project-definition.md` + `progress.md`，然后搭 P1。

---

## 6. `project-definition.md`（新增 · 画像权威源）

新增模板 `assets/templates/harness/project-definition.md.tmpl`：

```markdown
---
project_name: {{PROJECT_NAME}}
mode: greenfield
updated: {{DATE}}
---

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

**语义**
- frontmatter `project_name` 是 `{{PROJECT_NAME}}` 的唯一来源（修缺陷#1）。
- 「追问累积」段是增量追问的落地处：每答一项就把 `<待…>` 替换为实际值。
- 该文件是所有能力智能填充的唯一读取源。

---

## 7. 增量追问机制（映射表驱动）

### 7.1 「能力 → 所需画像字段」映射表（写入 SKILL.md，作为硬规则）

| 能力 | 所需字段 | 来源 | 触发追问 |
|------|---------|------|---------|
| P2 文档 | — | 首轮 | 否 |
| P3 闸门 | 应用类型 | 首轮已有 | 否（用首轮值决定是否生成 UI/平台条件闸门）|
| P4 Hooks | — | 通用 | 否 |
| P5 编码规范 | 主语言、lint/格式化配置、硬约束 | 首轮意向 + 选答 | **是**（lint 配置多半未定）|
| P6 提交纪律 | 协作模式（单人/团队）| 未填 | **是** |
| P7 agents | 技术栈细化、应用类型、协作模式 | 多半未定 | **是** |
| P8 OpenSpec | — | — | 否 |

### 7.2 追问流程（每个能力搭建前执行）

1. 读 `project-definition.md`。
2. 查映射表，得该能力所需字段。
3. 找出标 `<待…>` 的缺失项（已答字段不重复问）。
4. 有缺失 → 提问。**选项型字段**（如协作模式：单人/团队）用 AskUserQuestion（≤4 选项 + "Other" 兜底自由文本）；**开放型字段**（如技术栈细化）用普通对话。一次尽量问完该能力所有缺失项。
5. 回写 `project-definition.md`（替换对应 `<待…>`）。
6. 再搭建该能力（智能填充用更新后的画像）。

**硬约束**：缺失项未补全前不得开始该能力的搭建（修缺陷#4）。

---

## 8. L0 悬空引用解决（方案 2：自包含 + 渐进增强）

让 L0 宪法层**自带核心纪律**，对后续能力文件的引用降级为「增强（Px 生成；未生成时遵循内联原则）」，而非必需硬引用。

| 位置 | 改动 |
|------|------|
| `ai-behavior.md §2` | 内联「闸门顺序速查」（G1→G7 主链 + G8–G12 各一句话触发）；将"见 gates/index.md"降级为"详细触发时机/豁免见 gates/index.md（**P3 生成；未生成时遵循本节速查**）" |
| `ai-behavior.md §3 / §5` | 已内联 wip/squash 核心、三次阅读核心；文件引用统一标注"（**Px 生成**）增强，未生成遵循内联" |
| `SKILL.md Step 4`（引用完整性检查） | 加硬规则：**L0 宪法层（ai-behavior.md / project-context.md）的对外引用必须是「条件引用」（标注 Px 生成 + 内联降级），禁止指向尚未生成文件的必需硬引用** |

**效果**：P1 搭完时 L0 完全自包含可工作，gates/rules 只是"更详细的增强"，悬空引用从根上消除（不靠文件存在，而靠 L0 不再必需它们）。修缺陷#3。

---

## 9. 落地改动清单

**新增**
- ➕ `assets/templates/harness/project-definition.md.tmpl`（画像模板）

**修改**
- ✏️ `SKILL.md`
  - 重写 greenfield 首次分支为「首轮问答流程」（§5）。
  - 新增「增量追问」小节 + 映射表（§7）。
  - Step 0 / Step 3 引用 `project-definition.md`。
  - Step 4 加 L0 条件引用硬规则（§8）。
  - 首次判定表格补显式「双否 → greenfield」兜底（修缺陷相关表述）。
- ✏️ `assets/progress-schema.md`
  - 「项目画像」段改为**指针**（`→ .harness/project-definition.md`），不再内联画像内容。
- ✏️ `assets/templates/harness/L0/ai-behavior.md.tmpl`
  - §2 内联闸门速查；§3/§5 引用条件化（§8）。
- ✏️ `assets/templates/harness/L0/project-context.md.tmpl`
  - 明确"从 `project-definition.md` 生成"；未定字段标「待 scaffold / 追问后补」（不再假装已就绪）。

---

## 10. 对抗缺陷修补对照

| 对抗缺陷 | 修补方式 |
|---------|---------|
| #1 `{{PROJECT_NAME}}` 来源未定义 | 首轮 Q1 捕获 → `project-definition.md` frontmatter → 所有产物从此取 |
| #2 画像稀薄→后续错配 | 首轮 5 项 + 映射表按能力补全；追问发生在项目已 scaffold 后，画像更准 |
| #3 L0 悬空引用 | L0 自包含重构 + Step 4 条件引用硬规则（§8） |
| #4 追问无硬约束 | 映射表 = 硬规则，缺字段必须先问再搭建（§7.2） |

---

## 11. 验收标准

1. **greenfield 首次**：空文件夹调用 → 判定 greenfield → 普通对话一次问 5 项 → 生成 `project-definition.md`（含 frontmatter + 首轮段 + 追问累积段）+ `progress.md`（含画像指针）+ P1 骨架。
2. **占位符闭合**：P1 产物中所有 `{{PROJECT_NAME}}` 均被首轮 Q1 的值替换，无残留。
3. **追问触发**：搭 P6 前检测到「协作模式 = `<待…>`」→ 追问 → 回写 → 再搭 P6。
4. **不重复问**：已答字段（如应用类型）在后续能力搭建时不重复追问。
5. **L0 自包含**：P1 搭完、P3/P5/P6 未搭时，`ai-behavior.md` 独立可读，不出现"必需访问尚不存在文件"的硬引用；§2 内联闸门速查可独立指导。
6. **跨工具**：首轮与追问均以普通对话为基线，AskUserQuestion 仅作 Claude 下的选项型追问增强；任何工具下流程都可完成。

---

## 12. 开放问题

1. **提问方式修订待用户确认**：spec self-review 核实 AskUserQuestion 约束（1–4 问 × 2–4 选项、不支持开放文本）后，已把首轮从「AskUserQuestion 为主」改为「普通对话一次问 5 项 + 选项型追问用 AskUserQuestion」。需用户审查确认。
2. 映射表字段粒度已与用户确认无遗漏；L0 引用已确认一并按方案 2 解决。
