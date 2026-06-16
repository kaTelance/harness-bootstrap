---
name: "OPSX: New"
description: 创建新的 OpenSpec change（零安装，纯文件操作）
category: Workflow
tags: [workflow, openspec]
---

创建一个新的 change（变更提案）。零安装实现：不依赖 openspec CLI，用文件操作搭建 change 骨架。

**Input**: `/opsx:new <change-name>` 后的参数是 change 名称（kebab-case），或对要构建内容的描述。

## 前置：闸门衔接

本命令触发 **G1 需求清晰度**。创建 change 前必须理解用户想构建什么——不理解就先问。

## Steps

1. **无输入则询问**

   用 AskUserQuestion 工具（开放问题）问：

   > "你想做什么 change？描述要构建或修复的内容。"

   从描述推导 kebab-case 名称（如 "add user authentication" → `add-user-auth`）。

   **重要**：不理解用户意图前不要继续。

2. **验证名称**
   - 必须 kebab-case（小写字母 + 数字 + 连字符）。
   - 检查 `.harness/openspec/changes/<name>/` 是否已存在 → 已存在则建议用 `/opsx:continue`。

3. **创建 change 目录结构**（纯文件操作，替代 `openspec new` CLI）

   创建：

   ```
   .harness/openspec/changes/<name>/
   ├── proposal.md      # 复制自 .harness/openspec/_skeleton/proposal.md
   ├── tasks.md         # 复制自 .harness/openspec/_skeleton/tasks.md
   └── specs/           # delta specs 目录（propose 阶段按需填充）
   ```

   用 Write 工具创建 `proposal.md` 和 `tasks.md`（内容来自 `.harness/openspec/_skeleton/`）。

4. **展示 proposal 模板要求**

   proposal.md 需包含（详见 skeleton）：
   - `## Why`：动机 / 解决什么问题
   - `## What`：做什么 / 不做什么
   - `## Impact`：影响哪些 capability / 文件
   - `## Acceptance`：验收标准（可验证）

   proposal 写不清 = G1 不通过。

5. **STOP 等待用户指示**

## Output

```
## Change Created: <name>

- 位置: .harness/openspec/changes/<name>/
- 状态: 骨架已建（proposal.md + tasks.md 待填写）
- 下一步: 运行 /opsx:propose 完善提案，或直接描述 change 内容我来起草。
```

## Guardrails

- 不要在 new 阶段填 tasks 内容（只建空骨架）。
- 不要创建 delta specs（propose 阶段才填）。
- 名称非法（非 kebab-case）则要求合法名称。
- change 已存在则建议 `/opsx:continue`。
