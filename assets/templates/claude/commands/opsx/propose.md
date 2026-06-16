---
name: "OPSX: Propose"
description: 完善 change 的 proposal.md（需求澄清，执行 G1 闸门）
category: Workflow
tags: [workflow, openspec]
---

完善 change 的 proposal.md，执行 **G1 需求清晰度** 闸门。

**Input**: `/opsx:propose <change-name>`（可选，省略则从上下文推断或询问）。

## Steps

1. **选择 change**

   省略则用 AskUserQuestion 工具，从 `.harness/openspec/changes/` 子目录列表中选（Glob `.harness/openspec/changes/*/proposal.md`，排除 `archive/`）。

2. **读取现有 proposal.md**（`.harness/openspec/changes/<name>/proposal.md`）。

3. **G1 需求澄清（核心）**
   - **查依据**：读 `.harness/openspec/specs/` 相关 capability spec.md（Tier 2）+ `docs/`（Tier 3，先读 `docs/DOCS_INDEX.md`）。
   - **列不确定点**：明确写出「已确认事实」vs「待确认问题」，每个待确认问题说明影响什么决策。
   - **先问再做**：模糊点用 brainstorming 澄清，给 2-3 个方案 + 推荐，等用户确认影响实现的选择。

4. **填充 proposal.md**
   - `## Why`：动机 / 解决什么问题
   - `## What`：做什么 / 明确不做什么
   - `## Impact`：影响哪些 capability spec / 模块 / 文件
   - `## Acceptance`：验收标准（可验证，含测试如何证明完成）

5. **（可选）设计方案**

   如有架构/技术决策需求，创建 `design.md`（复制自 `.harness/openspec/_skeleton/design.md`）。

6. **（可选）delta spec**

   如涉及 capability spec 变更，起草 `.harness/openspec/changes/<name>/specs/<capability>/spec.md`（复制自 skeleton）。

7. **提示下一步**

   proposal 完善后 → `/opsx:apply`（实施）或先 `/opsx:explore`（探索现有实现）。

## Guardrails

- proposal 无验收标准 = G1 不通过，不可进入 apply。
- 需求变更 → 更新 proposal + 受影响 `docs/` / README。
- 不臆测需求，模糊点先问。
- 把 AI 建议写成已确认需求 = 违反 G1。
