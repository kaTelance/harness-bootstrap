# Agent 技术栈 Profiles

> SKILL 生成领域专家 agent 时，参考本文件填充 `_domain-expert.md.tmpl`。
> 按项目主技术栈选择对应 profile，填充 Core Philosophy / Mindset / Architecture / Rules / Checklist。

---

## TypeScript / React

- **Mindset**：严格模式禁止 `any`；仅函数组件；Zustand 管状态；副作用隔离；性能边界（避免无谓 re-render）。
- **Architecture**：组件层（纯展示）/ 状态层（Zustand store）/ 服务层（API 调用）。
- **Rules**：不用 Context 管理全局状态；不用 CSS-in-JS；外部 API 走类型化客户端。
- **Checklist**：strict mode；无 `any`；组件纯展示；错误边界；key 稳定。

## Rust

- **Mindset**：`Result<T, AppError>` 不 `unwrap()`；写操作用事务；错误用 `thiserror` + `anyhow`。
- **Architecture**：仓储模式（Repository）；后台任务 `tokio::spawn`（异步）/ `rayon`（CPU 密集）。
- **Rules**：生产禁 `unwrap`；数据库写必事务；模块边界清晰；错误显式传播。
- **Checklist**：无 `unwrap`/`expect`；错误传播完整；事务边界正确；无未处理 `Result`。

## Python

- **Mindset**：类型注解；测试先行；依赖注入。
- **Architecture**：分层（domain / service / repository）；配置外置。
- **Rules**：不用裸 `except:`；日志规范；可变默认参数陷阱。
- **Checklist**：类型注解完整；无裸 except；测试覆盖核心路径。

## Go

- **Mindset**：显式 `error` 返回；并发安全；接口小而专注。
- **Architecture**：分包（cmd / internal / pkg）；接口抽象依赖。
- **Rules**：`error` 必检查；goroutine 泄漏防护（context + Done）；不 panic in lib。
- **Checklist**：error 全检查；goroutine 可退出；接口在消费侧定义。

---

## 推荐角色 agent（按项目规模按需生成）

| 角色            | 触发                    | 适用               |
| --------------- | ----------------------- | ------------------ |
| 主领域 expert   | 按主技术栈              | 所有项目（必生成） |
| debugger        | bug 排查                | 所有项目（建议）   |
| frontend-expert | UI / 组件 / 样式        | 有前端             |
| backend-expert  | API / 数据库 / 业务逻辑 | 有后端             |
| qa-engineer     | 测试 / 验证             | 中大项目           |
| devops-engineer | CI/CD / 部署            | 有部署需求         |

### 生成规模建议

- **小项目**：1 个主领域专家（按主技术栈）+ debugger。
- **中项目**：主专家 + frontend（或 backend）+ qa + debugger。
- **大项目 / monorepo**：frontend + backend + qa + devops + debugger。

> 生成多个 agent 时，每个 agent 的 `description` 触发词应互不重叠，避免路由冲突。
