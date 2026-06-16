---
name: "OPSX: Verify"
description: 验证实现与 change artifacts 一致（归档前），生成 verification.md
category: Workflow
tags: [workflow, openspec, verify]
---

验证实现与 change 的 artifacts（specs / tasks / design）一致，归档前检查。生成 verification.md。

**Input**: `/opsx:verify <change-name>`（可选，省略则推断或询问，不猜测）。

## Steps

1. **选择 change**（省略则 Glob `.harness/openspec/changes/*/` + AskUserQuestion，不自动选）。

2. **读上下文文件**（纯文件操作，替代 openspec CLI）：
   - `.harness/openspec/changes/<name>/tasks.md`
   - `.harness/openspec/changes/<name>/proposal.md`
   - `.harness/openspec/changes/<name>/design.md`（如有）
   - `.harness/openspec/changes/<name>/specs/*/spec.md`（delta）

3. **三维度验证**（每维度 CRITICAL / WARNING / SUGGESTION）：

   **Completeness（完整性）**：
   - tasks.md 勾选：`- [ ]` 未完成 → 每个 CRITICAL，建议"完成或标记已完成"。
   - delta spec requirements（`### Requirement:`）：搜索代码库验证实现存在，未实现 → CRITICAL。

   **Correctness（正确性）**：
   - 每个 requirement：grep 实现证据，记录 `file:line`。偏离 spec → WARNING。
   - 每个 scenario（`#### Scenario:`）：检查实现 + 测试覆盖。未覆盖 → WARNING。

   **Coherence（一致性）**：
   - design.md 决策（`## Decision:` / `## Approach:`）：验证实现遵循。矛盾 → WARNING。
   - 代码模式一致性：与项目既有模式偏离 → SUGGESTION。

4. **生成 verification.md**

   写入 `.harness/openspec/changes/<name>/verification.md`（结构复制自 skeleton）：
   - Summary scorecard（三维度状态表）
   - Issues by priority（CRITICAL / WARNING / SUGGESTION + 具体建议 + `file:line`）
   - Final Assessment

5. **最终评估**：
   - 有 CRITICAL → "X critical issue(s). 修复后再归档。"
   - 仅 WARNING → "无 critical。Y warnings。可归档（建议先改）。"
   - 全通过 → "All checks passed. Ready for archive."

## 验证启发式

- Completeness：聚焦客观清单项（勾选 / requirements 列表）。
- Correctness：关键词搜索 + 文件路径分析 + 合理推断，不要求完美确定。
- Coherence：抓明显不一致，不抠风格。
- 不确定时优先级：SUGGESTION > WARNING > CRITICAL。
- 每个 issue 必须有具体、可操作的建议（含 `file:line`）。

## 优雅降级

- 只有 tasks.md → 仅验证 task 完成。
- tasks + specs → 验证完整性 + 正确性。
- 全 artifacts → 三维全验。
- 总是说明跳过了哪些检查及原因。
