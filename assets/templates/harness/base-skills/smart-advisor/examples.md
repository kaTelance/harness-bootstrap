# Smart Advisor 使用示例

## 基本用法

### 示例 1：数据库选择

```bash
/smart-advisor 数据库选择
```

**场景**：为新项目选择合适的数据库

**流程**：
1. Smart Advisor 读取项目配置（package.json、技术栈等）
2. 调研数据库最佳实践
3. 提供详细的选择题（PostgreSQL vs MongoDB vs MySQL）
4. 用户选择后，继续讨论表结构设计、索引策略等
5. 生成决策摘要并保存

**输出文件**：`docs/decisions/2026-06-17-数据库选择.md`

---

### 示例 2：部署策略

```bash
/smart-advisor 部署策略
```

**场景**：选择项目的部署方式

**流程**：
1. Smart Advisor 读取项目结构、Dockerfile、CI/CD 配置
2. 调研部署最佳实践（Docker、Kubernetes、Serverless 等）
3. 提供详细的选择题
4. 用户选择后，继续讨论环境配置、监控策略等
5. 生成决策摘要并保存

**输出文件**：`docs/decisions/2026-06-17-部署策略.md`

---

### 示例 3：认证方案

```bash
/smart-advisor 认证方案
```

**场景**：为应用选择认证和授权方案

**流程**：
1. Smart Advisor 读取项目代码、API 路由、用户模型
2. 调研认证最佳实践（JWT、Session、OAuth 等）
3. 提供详细的选择题
4. 用户选择后，继续讨论安全策略、会话管理等
5. 生成决策摘要并保存

**输出文件**：`docs/decisions/2026-06-17-认证方案.md`

---

## 高级用法

### 示例 4：架构设计

```bash
/smart-advisor 微服务架构
```

**场景**：评估是否采用微服务架构

**流程**：
1. Smart Advisor 分析项目规模、团队结构、业务复杂度
2. 调研微服务架构的最佳实践和反模式
3. 提供详细的选择题（单体 vs 微服务 vs 模块化单体）
4. 用户选择后，继续讨论服务拆分、通信方式、数据管理等
5. 生成决策摘要并保存

**输出文件**：`docs/decisions/2026-06-17-微服务架构.md`

---

### 示例 5：测试策略

```bash
/smart-advisor 测试策略
```

**场景**：制定项目的测试策略

**流程**：
1. Smart Advisor 读取现有测试代码、测试配置
2. 调研测试最佳实践（单元测试、集成测试、E2E 测试等）
3. 提供详细的选择题
4. 用户选择后，继续讨论测试覆盖率、CI 集成等
5. 生成决策摘要并保存

**输出文件**：`docs/decisions/2026-06-17-测试策略.md`

---

## 输出示例

### 决策摘要文档示例

```markdown
# 决策记录：数据库选择

**日期**：2026-06-17
**项目**：my-web-app
**语言**：中文

## 背景
项目是一个电商 Web 应用，需要处理用户数据、订单数据、产品数据。数据结构相对固定，需要复杂查询和事务支持。

## 讨论内容

### 问题 1：主数据库选择
**项目分析**：Node.js + Express 技术栈，需要 ACID 事务支持

**选项分析**：
- A. PostgreSQL：支持复杂查询和事务，生态成熟
- B. MongoDB：灵活 schema，水平扩展容易
- C. MySQL：简单易用，性能优秀

**推荐方案**：PostgreSQL
**最终决策**：PostgreSQL

### 问题 2：缓存策略
**项目分析**：高并发场景，需要缓存热点数据

**选项分析**：
- A. Redis：高性能，支持多种数据结构
- B. Memcached：简单高效，适合纯缓存场景
- C. 本地缓存：无网络开销，但无法分布式共享

**推荐方案**：Redis
**最终决策**：Redis

### 问题 3：ORM 选择
**项目分析**：TypeScript 项目，需要类型安全

**选项分析**：
- A. Prisma：类型安全，自动迁移
- B. TypeORM：功能完整，社区活跃
- C. Sequelize：成熟稳定，文档丰富

**推荐方案**：Prisma
**最终决策**：Prisma

## 最终决策摘要
- 主数据库：PostgreSQL
- 缓存：Redis
- ORM：Prisma

## 后续行动
1. 安装 PostgreSQL 和 Redis
2. 配置 Prisma 连接
3. 设计数据库表结构
4. 实现数据访问层
```

---

## 常见问题

### Q1：如何指定讨论主题？
A：使用 `/smart-advisor <topic>` 命令，例如 `/smart-advisor 数据库选择`

### Q2：如果不指定主题会怎样？
A：Smart Advisor 会自动检测项目特征，建议相关主题

### Q3：如何结束讨论？
A：当 Smart Advisor 询问"是否继续？"时，回答"结束"或"完成"

### Q4：决策摘要保存在哪里？
A：保存在 `docs/decisions/YYYY-MM-DD-<topic>.md`

### Q5：支持哪些语言？
A：自动检测项目语言，支持中文、英文等

### Q6：调研失败怎么办？
A：Smart Advisor 会自动降级，使用内置知识库

### Q7：可以重新开始吗？
A：可以，重新调用 `/smart-advisor <topic>` 即可

### Q8：如何查看历史决策？
A：查看 `docs/decisions/` 目录下的文件
