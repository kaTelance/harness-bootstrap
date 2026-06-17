# Design: harness-bootstrap 自动分发 smart-advisor 基础 skill

> 为 harness-bootstrap skill 设计「调用时自动把 smart-advisor 作为基础 skill 落地到目标项目 `.claude/skills/`」的机制。
> 状态：已通过 brainstorming 澄清（4 项决策）+ 设计确认，待写实现计划。
> 日期：2026-06-17

---

## 1. 背景与动机

`smart-advisor` 是作者维护的**全局个人 skill**（`~/.claude/skills/smart-advisor/`，含 `SKILL.md` + `examples.md`，~20KB，自包含、无外部依赖），定位为「通用决策顾问」——遇到技术选型/架构决策时通过读项目上下文 + 调研最佳实践，给结构化选择题与推荐。

希望让任意项目在被 `harness-bootstrap` 搭建时，**自动获得 smart-advisor 作为基础 skill**，使每个被 bootstrap 的项目都自带决策顾问能力，而不必逐项目手动拷贝。

直接照搬现有产物机制（如 P7 把 agents 模板写进 `.claude/agents/`）不够，因为：

| # | 议题 | 需要决策 |
|---|------|---------|
| 1 | smart-advisor 如何「物理到达」目标项目 | vendor 快照 vs 运行时从全局复制 |
| 2 | 在哪个生命周期点装上 | 首搭即装 vs 每次幂等确保 vs 独立能力 |
| 3 | 已存在时的行为 | 在场即跳过 vs 每次三选一 |
| 4 | 「确保在场」的机械程度 | 散文指令 vs 脚本 vs 清单+脚本 |

本设计用「vendor + 基础层 substrate + 清单+ensure 脚本」一并回答以上四点，且与刚完成的「preflight 闭环」机制同构。

---

## 2. 目标与非目标

**目标**
- 让任意被 bootstrap 的项目（greenfield / brownfield / 已 bootstrap 过的老项目）都自带 smart-advisor。
- 该「基础 skill」是 **substrate（基底）**：每次调用幂等确保在场，**不计** progress.md 能力 checkbox。
- 机械保证（脚本 + 清单），不依赖 LLM 记忆——与 preflight 闭环追求的「机械牙齿」一致。
- 可扩展：未来加第二个基础 skill = 清单加一行。

**非目标**
- 不改能力清单 P1–P8 的划分与产物范围（smart-advisor 不新增 P 级能力）。
- 不违反「产物只落 5 处根级位置（CLAUDE.md/AGENTS.md/.claude/.harness/docs）」铁律——`.claude/skills/` 与 `.harness/base-skills/` 均在白名单根级位置内。
- 不做版本戳 / 漂移检测 / sync 子命令（纯幂等 + vendor 已足够）。
- 不在 CLAUDE.md 自动引用 smart-advisor（可选润色，留作后续）。

---

## 3. 设计决策（brainstorming 澄清结论）

| 决策点 | 选定 | 理由 |
|--------|------|------|
| 分发机制 | **Vendor 进模板** | 与 P1「原样复制 `preflight-profile.mjs`」同构；自包含、离线、版本锁定、跨机可复现；代价是与全局 smart-advisor 更新会漂移（可接受）|
| 生命周期 | **基础层 substrate·每次幂等确保** | 「基础 skill」语义即基底；fresh 与已 bootstrap 的老项目都能覆盖；不计 progress.md checkbox |
| 幂等策略 | **在场即跳过·纯幂等** | 缺则装、有则不碰；尊重用户定制/旧版；不自动刷新（要刷新手动删除重跑）|
| 机制化 | **清单 `base-skills.json` + `ensure-base-skills.mjs` 脚本** | 与 `capability-field-map.json`「数据文件=唯一真源」哲学一致；可 `node:test` 断言；可扩展 |

> **payload 仓库位置**（已确认）：vendor 在 `assets/templates/harness/base-skills/smart-advisor/`，与 `base-skills.json`、`ensure-base-skills.mjs` **同组**，P1 一起原样复制到 `.harness/`。
>
> **删除恢复**（已确认）：用户删除 `.claude/skills/smart-advisor/` 后，靠 `.harness/base-skills/` 暂存**自主重装**（ensure 下次调用时补回）。

---

## 4. 机制总览与数据流

机制两跳，都以 `.harness/` 为中枢（与 preflight/map 同构：机械产物落 `.harness/`，跨会话/跨机可复跑）：

```
跳 1（P1 一次性，机械可复现）：
  install assets/templates/harness/{base-skills.json, ensure-base-skills.mjs, base-skills/smart-advisor/}
    ──原样复制──▶ 目标 .harness/{base-skills.json, ensure-base-skills.mjs, base-skills/smart-advisor/}

跳 2（ensure，幂等；调用时机见 §6.1 三态）：
  node .harness/ensure-base-skills.mjs
    遍历清单 → 对每个 skill：
      .claude/skills/<name>/ 缺失 ──复制──▶ .claude/skills/<name>/   （源 = .harness/base-skills/<name>/）
      .claude/skills/<name>/ 在场 ──跳过──▶ no-op（不碰，尊重定制）
    退出码 0 + 末行 JSON 摘要
  调用时机：
    - 正常续跑/已 bootstrap 项目 → Step 0 前置跑一次（连续模式循环外）
    - fresh 首调 → Step 0 前置跳过，P1 末尾跑一次（首装）
    - 老项目机械缺失 → 提示 P1 幂等补全后，补全流程内跑

最终：.claude/skills/smart-advisor/ → CC 自动发现 → /smart-advisor 可用
```

**为何两跳 / 为何暂存于 `.harness/`**：ensure 脚本运行在目标项目的 `.harness/`，无法获知 harness-bootstrap 的安装路径，故不能直接从 install 目录复制。把 payload 暂存到 `.harness/base-skills/` 后，ensure 自含可复制源；这也使「用户删除后自主重装」成立，从而「每次确保在场」是真正的机械保证而非空话。

---

## 5. 文件结构

### 5.1 仓库新增（harness-bootstrap 的 `assets/templates/`）

```
assets/templates/harness/
  base-skills.json                          ← 清单（唯一真源；ship 到 .harness/base-skills.json）
  ensure-base-skills.mjs                    ← ensure 执行体（ship 到 .harness/ensure-base-skills.mjs）
  base-skills/
    smart-advisor/
      SKILL.md                              ← verbatim 快照自 ~/.claude/skills/smart-advisor/SKILL.md
      examples.md                           ← verbatim 快照自 ~/.claude/skills/smart-advisor/examples.md
```

三者同组（「基础层机械」），P1 一起原样复制到 `.harness/`，与 `preflight-profile.mjs` + `capability-field-map.json` 的处理完全同构。smart-advisor 自包含无 `{{VAR}}`，纯 verbatim 复制，不走模板替换。

### 5.2 目标项目落点

```
.harness/base-skills.json                  ← 清单（ensure 据此遍历）
.harness/ensure-base-skills.mjs            ← 执行体
.harness/base-skills/smart-advisor/{SKILL.md, examples.md}  ← 暂存源
.claude/skills/smart-advisor/{SKILL.md, examples.md}        ← 最终产物（CC 自动发现）
```

### 5.3 `base-skills.json`（清单草案）

镜像 `capability-field-map.json` 的 meta 风格：

```json
{
  "_meta": {
    "purpose": "项目基础 skill 清单。ensure-base-skills.mjs 据此把每个 skill 从 .harness/base-skills/<source>/ 复制到 .claude/skills/<name>/。",
    "shipped_to": ".harness/base-skills.json",
    "idempotency": "缺失→复制；在场→不碰（纯幂等，尊重用户定制）"
  },
  "skills": [
    { "name": "smart-advisor", "source": "base-skills/smart-advisor" }
  ]
}
```

`source` 为相对 `.harness/` 的路径（指向暂存源）；`name` 既是 `.claude/skills/` 下的目录名，也是 SKILL.md frontmatter 的 `name`。

### 5.4 `ensure-base-skills.mjs`（执行体草案）

```
用法: node .harness/ensure-base-skills.mjs [--project <dir>]
退出码: 0 = 已处理（含单个 payload 缺失的降级告警）；1 = 清单 base-skills.json 缺失（机械未就绪）
行为:
  - 读 .harness/base-skills.json（缺失 → 报错退出 1「清单缺失，请重跑 P1」）
  - 对每个 skill {name, source}:
      目标 .claude/skills/<name>/ 存在 → 跳过（no-op）
      目标缺失、源 .harness/<source>/ 存在 → 递归复制 源 → 目标
      目标缺失、源也缺失 → 告警「payload 缺失，请重跑 P1」（不致命，继续处理其余 skill）
  - 末行打印 JSON 摘要 { installed:[...], skipped:[...], missing_payload:[...] }
```

> 退出码语义对齐 preflight：清单（机械本身）缺失 → 退出 1 提示重跑 P1；单个 payload 缺失是「可降级」→ 不致命，仅告警。
> **首调时序**：fresh 首调时 `.harness/` 尚无此脚本，Step 0 前置不会调用它（见 §6.1 三态），首装由 P1 末尾的 ensure 完成。

---

## 6. SKILL.md 接入点（改动）

### 6.1 新增「Step 0 前置：基础 skill 层确保」

挂在 **Step 0（判定模式）最开头**。三态逻辑（按 `.harness/ensure-base-skills.mjs` 与 `progress.md` 是否存在判定）：

```
### Step 0 前置：基础 skill 层确保（substrate，每次最前置）

读 .harness/ensure-base-skills.mjs 与 .harness/progress.md 是否存在，分三态：

1. 脚本存在（正常续跑 / 已 bootstrap 项目）→ 跑 node .harness/ensure-base-skills.mjs（幂等：缺则补、有则跳）。
2. 脚本不存在 且 progress.md 不存在（fresh 首调）→ 静默跳过本前置（.harness/ 尚未生成是正常的）；
   首装交给 P1 末尾的 ensure（见 §6.2）。Step 0 判定首次 → 搭 P1 → P1 落机械 + 末尾 ensure → 首装。
3. 脚本不存在 但 progress.md 存在（老项目，P1 早于本特性搭建过）→ 同 preflight/map 缺失：
   提示「基础层机械缺失，建议重跑 P1 幂等补全」，补完续行。

- 缺失的基础 skill → 从 .harness/base-skills/ 复制到 .claude/skills/。
- 在场 → 跳过（不碰用户定制/旧版）。
- 连续模式只在循环外跑一次（幂等，无需每轮）。

> 基础 skill 是 substrate，不计 progress.md 能力 checkbox；清单与脚本由 P1 落到 .harness/（见 Step 2 P1 专属）。
```

### 6.2 P1 产物表 + Step 2 扩展

- **P1 行产物** 追加：`.harness/base-skills.json`、`.harness/ensure-base-skills.mjs`、`.harness/base-skills/smart-advisor/`（ship 到 `.harness/`）。
- **Step 2 P1 专属** 现有「原样复制 preflight-profile.mjs + capability-field-map.json」扩展为同批复制 `base-skills.json` + `ensure-base-skills.mjs` + `base-skills/smart-advisor/`。
- **P1 末尾** 跑一次 `node .harness/ensure-base-skills.mjs` → 首搭即落 `.claude/skills/smart-advisor/`（fresh 项目首调即获得基础 skill）。

### 6.3 边界与失败模式表新增行

| 场景 | 行为 |
|------|------|
| `.claude/skills/smart-advisor/` 已存在 | ensure 跳过（不碰，尊重定制/旧版）|
| 老项目缺 `.harness/ensure-base-skills.mjs` 或 `base-skills.json` | 同 preflight/map 缺失：提示按 P1 幂等补全（补清单+脚本+payload），再续行 |
| `.harness/base-skills/smart-advisor/` payload 缺失 | ensure 非致命告警（不阻塞其它 P 步骤），提示重跑 P1 |

---

## 7. 落地改动清单

**新增**
- ➕ `assets/templates/harness/base-skills.json`（清单）
- ➕ `assets/templates/harness/ensure-base-skills.mjs`（执行体）
- ➕ `assets/templates/harness/base-skills/smart-advisor/SKILL.md`（verbatim 快照）
- ➕ `assets/templates/harness/base-skills/smart-advisor/examples.md`（verbatim 快照）

**修改**
- ✏️ `SKILL.md`
  - 新增「Step 0 前置：基础 skill 层确保」（§6.1）。
  - P1 产物表追加基础层产物（§6.2）。
  - Step 2 P1 专属扩展同批复制 + P1 末尾跑 ensure（§6.2）。
  - 边界与失败模式表新增 3 行（§6.3）。

**测试**
- ➕ `assets/tests/templates/base-skills.test.mjs`：清单合法（smart-advisor 已列、`source` 存在、payload 含合法 SKILL.md frontmatter `name: smart-advisor` + `examples.md`）。
- ➕ `assets/tests/scripts/ensure-base-skills.test.mjs`：fixture——缺失→复制且退出 0；在场→内容原样不动（no-op）；幂等（跑两次等价）；payload 缺失→告警不致命；清单缺失→退出 1。
- ✏️ `assets/tests/templates/skill-md.test.mjs`（已有）：追加断言——SKILL.md 含「Step 0 前置 基础 skill」+ `ensure-base-skills.mjs` + P1 产物含 base-skills。

---

## 8. 维护约定

smart-advisor 是**外部演进 skill**（作者 sisyphus，当前 version 1.0）。本设计为 **vendor 快照**，故：

- smart-advisor 上游更新后，需**手动重新 vendor**：把 `~/.claude/skills/smart-advisor/{SKILL.md, examples.md}` 覆盖回 `assets/templates/harness/base-skills/smart-advisor/`，提交。已 bootstrap 的老项目下次调用 ensure 时**不会**自动刷新（纯幂等·在场即跳过）；需刷新则用户手动删除目标 `.claude/skills/smart-advisor/` 后重跑。
- 不引入 sync 子命令 / 漂移检测（YAGNI，已确认）。

---

## 9. 验收标准

1. **fresh 首搭**：空/新项目首调 `/harness-bootstrap` → P1 落 `.harness/` 基础层机械 + 末尾跑 ensure → `.claude/skills/smart-advisor/` 生成、`/smart-advisor` 可用。
2. **老项目补全**：已 bootstrap 过（无基础层机械）的项目调用 → Step 0 前置检测机械缺失 → 提示并按 P1 幂等补全 → 续行后 smart-advisor 在场。
3. **纯幂等**：smart-advisor 已在场时调用 → ensure no-op，`.claude/skills/smart-advisor/` 内容**逐字节不变**（即便与 vendor 副本不同，尊重定制）。
4. **自主重装**：用户删除 `.claude/skills/smart-advisor/` 后调用 → ensure 从 `.harness/base-skills/smart-advisor/` 补回。
5. **可扩展**：在 `base-skills.json` `skills` 数组加一项 + 放对应 payload → ensure 自动覆盖，无需改脚本/SKILL.md。
6. **机械保证**：`node --test` 全绿；`skill-md.test.mjs` 锁住 Step 0 前置 + ensure 引用。
7. **Guardrail 不破**：所有新产物均落 `.claude/` 或 `.harness/` 根级白名单内。

---

## 10. 开放问题

无。4 项核心决策 + payload 位置 + 删除恢复策略均已在 brainstorming 确认。
