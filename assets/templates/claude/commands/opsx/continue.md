---
name: "OPSX: Continue"
description: 断点续传：读取 tasks 进度，从断点继续实施 change
category: Workflow
tags: [workflow, openspec]
---

断点续传。读取 tasks.md 勾选状态，从上次中断处继续实施 change（支持跨会话）。

**Input**: `/opsx:continue <change-name>`（可选，省略则推断或询问）。

## Steps

1. **选择 change**

   省略则 Glob `.harness/openspec/changes/*/tasks.md`（排除 archive）+ AskUserQuestion 让用户选。

2. **读取进度**
   - 读 `tasks.md`，统计 `- [x]`（完成）/ `- [ ]`（未完成）。
   - 读 `proposal.md` + `design.md` + delta specs 重建上下文。

3. **定位断点**
   - 找到第一个未完成的 task。
   - 如有进度记录（`git log` 的 wip commits / 上次会话输出），据此恢复上下文。

4. **从断点继续实施**

   执行与 `/opsx:apply` Step 4 相同的流程（闸门链 G2 → G3 → G4 → G5 → G7）。从第一个未完成 task 开始。

5. **完成或暂停时展示状态**（同 apply）。

## Guardrails

- 不重做已完成的 task（除非验证发现回归）。
- 先恢复上下文（读 proposal / design / tasks / git log）再继续，不凭记忆。
- 暂停条件同 apply。
