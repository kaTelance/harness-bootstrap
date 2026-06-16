---
name: "OPSX: Archive"
description: 归档已完成的 change（移动到 archive/ + 可选同步 specs）
category: Workflow
tags: [workflow, openspec, archive]
---

归档已完成的 change。零安装：用文件移动 + 手动 sync 替代 openspec CLI。

**Input**: `/opsx:archive <change-name>`（可选，省略则推断或询问，不猜测）。

## Steps

1. **选择 change**（省略则 Glob `.harness/openspec/changes/*/` + AskUserQuestion）。

2. **检查 task 完成状态**

   读 tasks.md，统计 `- [ ]`（未完成）。有未完成 → 警告 + 确认是否继续。

3. **检查 verification**

   如有 `verification.md`，读 Final Assessment。有 CRITICAL → 强烈建议先修复，确认后才归档。无 verification.md → 建议先 `/opsx:verify`，确认后继续。

4. **评估 delta spec 同步**
   - 检查 `.harness/openspec/changes/<name>/specs/` 是否有 delta。
   - 有 delta → 对比主 spec（`.harness/openspec/specs/<capability>/spec.md`），汇总将应用的变更（adds / modifications / removals）。
   - 提示选项：「立即同步（推荐）」/「不同步归档」/「取消」。
   - 选同步 → 执行 `/opsx:sync` 逻辑（手动合并 delta 到主 spec）。

5. **执行归档（文件移动）**

   ```bash
   mkdir -p .harness/openspec/changes/archive
   mv .harness/openspec/changes/<name> .harness/openspec/changes/archive/YYYY-MM-DD-<name>
   ```

   目标名用当前日期。已存在 → 报错，建议改名或换日期归档。

6. **更新 `.harness/openspec/INDEX.md`**（归档后移动条目，保持索引一致 → G11）。

7. **显示归档摘要**：change 名 + 归档位置 + sync 状态 + warnings。

## Guardrails

- 总是让用户选 change（不自动选）。
- 不因 warning 阻断归档，只告知 + 确认。
- 移动目录时保留所有文件（proposal / design / tasks / specs / verification）。
- 同步是可选的（用户可跳过）。
- 更新 INDEX 保持索引一致。
