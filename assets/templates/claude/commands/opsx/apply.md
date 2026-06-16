---
name: "OPSX: Apply"
description: 实施 change 的 tasks（执行 G2→G3→G4→G5→G7 闸门链）
category: Workflow
tags: [workflow, openspec]
---

实施 change 的 tasks，执行闸门链 G2 → G3 → G4 → G5 → G7。

**Input**: `/opsx:apply <change-name>`（可选，省略则从上下文推断或询问）。

## Steps

0. **G1 需求清晰度（强制）**

   读 `proposal.md` + `design.md` + delta specs。若 task 缺文档 / spec 支持、行为模糊、验收标准不全或暴露需求变更 → 停下，与用户澄清。不写未确认的实现代码。需求变更 → 更新 proposal + 受影响 `docs/` / README。

1. **选择 change**

   省略则从上下文推断；模糊则 Glob `.harness/openspec/changes/*/` + AskUserQuestion 让用户选。声明 "Using change: <name>"。

2. **读上下文文件**
   - `.harness/openspec/changes/<name>/proposal.md`
   - `.harness/openspec/changes/<name>/design.md`（如有）
   - `.harness/openspec/changes/<name>/specs/*/spec.md`（delta）
   - `.harness/openspec/changes/<name>/tasks.md`

3. **展示进度**

   解析 tasks.md 勾选状态（`- [x]` vs `- [ ]`），显示 N/M complete + 剩余 task 概览。

4. **实施 tasks（循环直到完成或阻塞）**

   对每个未完成 task：
   - **G2 计划质量**：确认 task 是单一动作 + 有精确文件路径 + 有验证标准。不符合 → 停下补计划。
   - **G3 Plan-to-Apply 检查站**：确认 G1/G2 通过 + 计划已认可，签发进入实施。
   - **G4 影响评估 + G5 代码影响审查**：修改已有代码前完成三次阅读（目标 / 调用方 / 被调用）+ 行为依赖表。
   - **G7 执行质量**：TDD（先写失败测试 → 实现 → 测试通过）；每步验证（测试 / 编译 / 类型）；无 TODO / 占位符；改动最小且聚焦。
   - task 完成后：立即在 tasks.md 将 `- [ ]` → `- [x]`。
   - 遵循 `.harness/rules/auto-commit-workflow.md`：只 stage 相关文件 + 本地 conventional commit（WIP）。**不 git push**。
   - 需求 / 命令 / 入口 / 用户流程变化 → 同步 proposal + `docs/` + README。

   **暂停条件**：task 不清 / 暴露设计问题 / 出错或阻塞 / 用户中断。

5. **完成或暂停时展示状态**
   - 完成："All tasks complete. 可用 /opsx:verify 后 /opsx:archive。"
   - 暂停：说明原因 + 已完成进度 + 选项。

## Guardrails

- task 模糊 → 停下问，不猜。
- 立即勾选完成的 task。
- 每完成一个 task 本地 commit（auto-commit-workflow）。
- 不自动 push（push 由用户手动）。
- 出错 / 阻塞 / 不支持的 spec → 暂停，不猜。
- 偏离已审计划 → 回 G2 修订，不在 apply 中即兴发挥。
