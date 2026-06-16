---
name: "OPSX: FF"
description: Fast-forward：小 change 的精简流（合并 new+propose+apply）
category: Workflow
tags: [workflow, openspec]
---

Fast-forward 流：用于小型、明确的 change（如 bug fix、小改进）。合并 new + propose + apply 为精简流程，跳过完整提案文档开销。

**Input**: `/opsx:ff <描述>`。

## 适用判断

仅适用于：

- 单一明确目标（如"修复 X 导致 Y"）。
- 影响范围小（1-3 文件）。
- 无架构决策。
- 有清晰验收标准。

**不适用** → 用完整流程（`/opsx:new` → `/opsx:propose` → `/opsx:apply`）。

## Steps

1. **理解目标**（G1）。

2. **创建精简 change 骨架**
   - `.harness/openspec/changes/<name>/proposal.md`（精简版：Why + What + Acceptance，一段话级别，无需完整 Impact 分析）。
   - `.harness/openspec/changes/<name>/tasks.md`。

3. **直接实施**（G4 / G5 / G7）
   - 仍走影响评估 + 代码影响审查（修改已有代码时）+ TDD。
   - **不跳过验证**。

4. **verify + 可选 archive**（同标准流程）。

## Guardrails

- ff **不豁免闸门**（G1 / G4 / G5 / G7 仍适用），只精简文档。
- bug fix 仍走 G9 协议（根因 + 冷却期），ff 不豁免。
- 实施中发现范围扩大 → 升级为完整流程（补充 `design.md` + 完整 proposal）。
