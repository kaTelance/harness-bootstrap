---
name: "OPSX: Sync"
description: 将 change 的 delta spec 合并到主 specs（归档时或手动触发）
category: Workflow
tags: [workflow, openspec, sync]
---

将 change 的 delta spec 合并到主 specs（`.harness/openspec/specs/<capability>/spec.md`）。归档时自动触发或手动调用。

**Input**: `/opsx:sync <change-name>`（可选，省略则询问）。

## Steps

1. **选择 change**（省略则询问）。

2. **定位 delta specs**
   - Glob `.harness/openspec/changes/<name>/specs/*/spec.md`
   - 每个 delta 对应一个 capability。

3. **对每个 delta（capability）合并**
   - 读 delta spec（`.harness/openspec/changes/<name>/specs/<capability>/spec.md`）。
   - 读主 spec（`.harness/openspec/specs/<capability>/spec.md`，不存在则创建）。
   - 识别变更类型（delta 中的标记）：
     - `## MODIFIED` → 修改现有 requirement / scenario
     - `## ADDED` → 新增
     - `## REMOVED` → 删除
     - `## RENAMED` → 重命名
   - 合并到主 spec（手动编辑，保持 requirement / scenario 结构与编号连续）。

4. **验证合并结果**
   - 主 spec 无冲突标记残留（`>>>>>>` 等）。
   - requirement 编号连续无重复。
   - scenario 引用的 requirement 都存在（无悬空引用）。

5. **汇总报告**：每个 capability 的合并结果（adds / mods / removes 计数）。

## Guardrails

- 合并是 spec 级别的（requirements + scenarios），不是文件级覆盖。
- 删除 requirement → 先确认无其他 spec / change 引用。
- 合并后主 spec 必须自洽（无悬空引用）。
- delta spec 在归档时随 change 一起保留（历史记录，不删除）。
- 合并涉及主 spec 结构变化 → 触发 G11（spec 是治理事实源）。
