---
name: "OPSX: Explore"
description: 探索现有 OpenSpec specs 和 changes（了解已有规范）
category: Workflow
tags: [workflow, openspec]
---

探索项目的 OpenSpec 规范库，了解已有 capability specs 和 changes。

**Input**: `/opsx:explore [关键词]`（可选，用于聚焦特定 capability 或 change）。

## Steps

1. **读索引**

   读取 `.harness/openspec/INDEX.md`（specs / changes 分组索引，定位入口）。

2. **列出 capability specs**
   - Glob `.harness/openspec/specs/*/spec.md`
   - 对每个 spec，读取头部摘要，列出 capability 名称 + 核心要求。

3. **列出进行中 changes**
   - Glob `.harness/openspec/changes/*/proposal.md`（排除 `archive/`）
   - 对每个 change，列出名称 + proposal 的 Why/What 摘要 + tasks 进度（`- [x]` / `- [ ]` 计数）。

4. **列出归档 changes**（历史）
   - `.harness/openspec/changes/archive/YYYY-MM-DD-*/` 下的 change 清单。

5. **按关键词聚焦**（如有输入）
   - 在 `.harness/openspec/specs/` 中 grep 关键词，定位相关 capability。
   - 在 changes 的 proposal/design 中 grep，定位相关变更。

6. **输出结构化摘要**

## 用途

- 开始新 change 前了解相关已有规范（避免重复）。
- G1 查依据时定位 Tier 2 spec。
- 新会话快速建立项目规范全景。
