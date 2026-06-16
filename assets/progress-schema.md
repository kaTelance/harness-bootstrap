# progress.md 结构定义

> 本文件是 harness-bootstrap SKILL 生成 `.harness/progress.md` 的模板规范。
> SKILL 在 P1 骨架阶段首次创建 progress.md，后续每次调用读写它实现断点续传。

## 模板（SKILL 替换 `{{...}}` 占位符后写入 `.harness/progress.md`）

```
# Harness 搭建进度
project: {{PROJECT_NAME}}            | mode: {{MODE}}
tech_stack: {{TECH_STACK}}           | created: {{DATE}} | updated: {{DATE}}

## 能力清单（P1→P8 推荐序，可调）
- [x] P1 骨架      @{{DATE}}   已搭: CLAUDE.md/AGENTS.md/.harness/L0/progress.md
- [ ] P2 文档结构  next        待搭: docs/DOCS_INDEX + 目录约定
- [ ] P3 闸门      pending      待搭: 通用核心闸门 + 索引
- [ ] P4 Hooks     pending      待搭: settings.json + 通用脚本
- [ ] P5 质量纪律  pending      待搭: bugfix/代码影响/重构/反模式
- [ ] P6 提交纪律  pending      待搭: WIP+squash 工作流
- [ ] P7 Agents    pending      待搭: 领域专家子代理
- [ ] P8 OpenSpec  pending      待搭: 零安装 opsx 命令

## 项目画像
画像权威源：`.harness/project-definition.md`（greenfield 首轮问答 + 增量追问累积；brownfield audit 结果同样写入该文件）。本 progress.md 不内联画像内容，仅指针引用。
```

## 断点续传语义

- **读取**：SKILL 每次调用先读 `.harness/progress.md`；不存在 = 首次调用。
- **目标解析**：第一个 `- [ ]` 行 = 本次目标；用户可用 `/harness-bootstrap P{n}` 指定跳转。
- **推进**：完成能力后把对应行改为 `- [x] P{n} ... @{{DATE}} 已搭: {产物}`，并把下一个 `- [ ]` 行的状态词标为 `next`。
- **状态词**：`pending`（未开始）/ `next`（下一次目标）/ 进行中用文案标注。
- **画像维护**：brownfield audit 或 greenfield 问答结果写入 `.harness/project-definition.md`（画像权威源），供后续能力智能填充引用；progress.md「项目画像」段仅存指针，不内联内容。
- **容错解析**：读取时跳过空行与 HTML 注释；若某能力行格式损坏（非 `- [ ]`/`- [x]` 前缀），按其 `P{n}` 编号识别状态而非依赖固定文案；若 progress.md 整体无法解析（如被清空/损坏），回退为「询问用户当前阶段」而非猜测推进。
