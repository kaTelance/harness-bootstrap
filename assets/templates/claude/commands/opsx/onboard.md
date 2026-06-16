---
name: "OPSX: Onboard"
description: 引导：了解项目 OpenSpec 规范 + harness 配置（新会话 / 新人）
category: Workflow
tags: [workflow, openspec, onboard]
---

引导用户（新会话 / 新成员）了解项目的 OpenSpec 规范库和 harness 配置，建立全景认知。

**Input**: 无（或 `/opsx:onboard <主题>` 聚焦特定领域）。

## Steps

1. **项目全景**
   - 读 `CLAUDE.md`（入口）→ L0 宪法（`.harness/L0/`）→ `project-context.md`。
   - 一句话总结项目是什么。

2. **harness 配置**
   - 列出闸门（`.harness/gates/index.md`）。
   - 列出 hooks（`.claude/settings.json`）。
   - 列出 rules（`.harness/rules/`）。
   - 列出 agents（`.claude/agents/`）。

3. **OpenSpec 规范**
   - 读 `.harness/openspec/INDEX.md`。
   - 列出 capability specs + 核心要求。
   - 列出进行中 changes + 进度（tasks 勾选率）。

4. **工作流速查**
   - 典型流程：`new` → `propose` → `apply` → `verify` → `archive`。
   - 闸门执行顺序：G1 → G2 → G3 → G4 → G5 → G7。
   - 小改用 `ff`，断点续传用 `continue`。

5. **按主题聚焦**（如有输入）：深入该主题的 specs / changes / docs。

## 输出

结构化全景摘要 + "下一步建议"（如"查看 X capability spec"或"继续 Y change"）。

## 用途

- 新会话快速建立上下文。
- 新成员上手项目。
- 长时间未操作后恢复记忆。
