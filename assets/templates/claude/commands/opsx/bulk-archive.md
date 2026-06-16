---
name: "OPSX: Bulk Archive"
description: 批量归档多个已完成 change
category: Workflow
tags: [workflow, openspec, archive]
---

批量归档多个已完成 change。对每个 change 执行 `/opsx:archive` 的检查 + 移动。

**Input**: `/opsx:bulk-archive [change1 change2 ...]`（可选，省略则列出所有可归档的让用户多选）。

## Steps

1. **列出候选**

   Glob `.harness/openspec/changes/*/tasks.md`（排除 archive）。对每个：
   - 统计 task 完成率
   - 检查 verification.md 是否存在 + 是否有 CRITICAL

2. **让用户多选**（AskUserQuestion）：
   - 默认推荐：tasks 全完成 + 无 CRITICAL 的 change。
   - 标记有未完成 task / CRITICAL 的 change 为「需确认」。

3. **逐个归档**（对选中的每个 change）：
   - 执行 `/opsx:archive` 流程（检查 + 可选 sync + 移动）。
   - 一个失败不影响其他（记录失败，继续下一个，最后汇总）。

4. **批量同步**（可选）：
   - 如多个 change 都有 delta，统一询问是否 sync。
   - sync 按依赖顺序（先被依赖的 capability）。

5. **汇总报告**：每个 change 的归档结果 + sync 状态 + 失败项。

## Guardrails

- 不自动批量 sync（每个 change 的 sync 单独确认或统一确认）。
- 一个 change 归档失败 → 记录 + 继续，不中断批量。
- 批量移动后统一更新 INDEX。
