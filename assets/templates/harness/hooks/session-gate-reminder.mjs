#!/usr/bin/env node
// .harness/hooks/session-gate-reminder.mjs
// Gates: G1-G12（会话启动时注入闸门纪律提醒）
// 跳序防护：若 .harness/gates/index.md 尚不存在（P4 早于 P3 搭建），
//           注入降级提示而非一串指向不存在文件的悬空路径。

import { existsSync } from "node:fs";

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  try {
    const projectDir = (
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.GEMINI_PROJECT_DIR ||
      process.env.QODERCN_PROJECT_DIR ||
      process.env.QODER_CWD ||
      ""
    )
      .replace(/\\/g, "/")
      .replace(/\/$/, "");

    const gatesReady = existsSync(`${projectDir}/.harness/gates/index.md`);
    const banner = "## Harness 质量闸门纪律（自动注入）";

    let context;
    if (gatesReady) {
      context = [
        banner,
        "",
        "开发前必须遵守闸门顺序: G1 → G2 → G3 → G4 → G5 → G7（G6 全程伴随）",
        "Bug fix 时 G9 适用; 同 bug 失败 2 次升级 G10; 重构时 G8 适用; 修改治理文件 G11; hook 反馈 G12",
        "",
        "| 闸门 | 触发时机 | 文件 |",
        "|------|---------|------|",
        "| G1 需求清晰度 | propose/apply/计划前 | .harness/gates/G1-requirements-clarity.md |",
        "| G2 实施计划质量 | 产出 plan/tasks 前 | .harness/gates/G2-plan-quality.md |",
        "| G3 Plan-to-Apply 检查站 | G2 后、apply 前 | .harness/gates/G3-plan-to-apply-checkpoint.md |",
        "| G4 影响评估 | 修改已有代码前 | .harness/gates/G4-impact-assessment.md |",
        "| G5 代码影响深度审查 | 修改已有函数前 | .harness/gates/G5-code-impact-review.md |",
        "| G6 架构延续 | 任何代码/文档变更 | .harness/gates/G6-architecture-continuity.md |",
        "| G7 实施执行质量 | apply 阶段 | .harness/gates/G7-apply-quality.md |",
        "| G8 重构安全 | 状态/事件/盒模型重构 | .harness/gates/G8-refactoring-safety.md |",
        "| G9 BugFix 验证 | 每次 bug fix | .harness/gates/G9-bugfix-protocol.md |",
        "| G10 重复修复升级 | 同 bug 失败 2 次 | .harness/gates/G10-repeat-fix-escalation.md |",
        "| G11 Harness 治理 | 改 .harness/ 治理文件/入口 | .harness/gates/G11-harness-governance.md |",
        "| G12 Hook 反馈闭环 | hook 反馈/闸门不通过 | .harness/gates/G12-hook-feedback-loop.md |",
        "",
        "条件闸门（按项目画像启用，见 .harness/gates/index.md）: UI 原型确认 / 平台规则 / 设计规范同步",
        "",
        "## 强制执行声明",
        "闸门不可跳过，「改动很小」不构成豁免。跳过闸门 = 触发 G12 反馈闭环。",
        "所有闸门执行前 MUST 先读 .harness/ANTI_PATTERNS.md 对照已知反模式。",
        "",
        "最高指令: 无终端日志不交付 | 无检索不调用 | 无阅读不修改 | 无类型前置不逻辑",
        "提交规则: 禁止自动 git push | conventional commits | WIP+Squash 两层提交",
      ].join("\n");
    } else {
      // 降级：闸门体系尚未搭建（可能 P4 早于 P3）。不注入悬空文件路径。
      context = [
        banner,
        "",
        "⚠ 闸门体系（.harness/gates/）尚未搭建。运行 `/harness-bootstrap P3` 生成闸门后再启用完整纪律。",
        "在闸门就位前，至少遵守最高指令: 无终端日志不交付 | 无检索不调用 | 无阅读不修改 | 无类型前置不逻辑。",
        "提交规则: 禁止自动 git push | conventional commits。",
      ].join("\n");
    }

    const isGemini = !!process.env.GEMINI_PROJECT_DIR && !process.env.QODER_IDE;
    const isClaude = !!process.env.CLAUDE_PROJECT_DIR;

    let output;
    if (isGemini) {
      output = JSON.stringify({ systemMessage: context });
    } else if (isClaude) {
      output = JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext: context,
        },
      });
    }

    if (output) process.stdout.write(output);
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[session-gate-reminder] error: ${e.message}\n`);
    process.exit(0);
  }
});
