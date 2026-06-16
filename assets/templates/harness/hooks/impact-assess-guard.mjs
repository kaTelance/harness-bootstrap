#!/usr/bin/env node
// .harness/hooks/impact-assess-guard.mjs
// Gate: G4 影响评估（提醒，不阻断）
// 修改共享/核心模块时注入影响评估提醒（仅 Edit/replace 操作触发，Write/新建不触发）
// 启发式匹配（无需项目画像注入）: monorepo 包导出入口 + 单包共享导出入口（刻意收紧）

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const toolName = (input.tool_name || "").toLowerCase();
    const toolInput = input.tool_input || {};
    const filePath = (toolInput.file_path || toolInput.path || "").replace(/\\/g, "/");

    const isEdit = /^(edit|replace|search_replace)$/.test(toolName);
    if (!isEdit) {
      process.exit(0);
      return;
    }

    // 共享/核心模块启发式。刻意收紧：只匹配「公共导出入口」和 monorepo 包，
    // 避免对 src/utils、src/common 等常见目录误报成噪音（被无视的提醒比不提醒更糟）。
    const sharedPatterns = [
      // monorepo 包根的导出入口：packages/<pkg>/src/index.* 等
      /\/(packages|crates|libs|modules|workspaces)\/[^/]+\/(src\/)?(index|lib|mod)\.(ts|tsx|js|jsx|mjs|rs|go|py)$/,
      // 单包项目共享导出入口：src/lib|shared|core/index.*
      /\/src\/(lib|shared|core)\/index\.(ts|tsx|js|jsx)$/,
      // Rust crate 入口
      /\/src\/lib\.rs$/,
    ];

    const isShared = sharedPatterns.some((p) => p.test(filePath));

    if (isShared) {
      const shortPath = filePath.split("/").slice(-3).join("/");
      const context = [
        `[G4 影响评估] 你正在修改共享/核心模块: ${shortPath}`,
        "修改前必须:",
        "1. grep 查找所有调用方 (rg \"from.*module\" 或 rg \"import.*symbol\")",
        "2. 评估影响类型: Breaking Change / 行为变更 / API 变更 / 性能影响",
        "3. 在 commit message body 中写明影响面扫描结论",
        "4. 如有 Breaking Change，需获得维护者确认后方可实施",
        "",
        "请确认已完成 G3 Plan-to-Apply Checkpoint 签发。",
        "如果尚未完成，STOP，先执行 .harness/gates/G3-plan-to-apply-checkpoint.md。",
        "详见 .harness/gates/G4-impact-assessment.md",
      ].join("\n");

      const isGemini = !!process.env.GEMINI_PROJECT_DIR && !process.env.QODER_IDE;
      const isClaude = !!process.env.CLAUDE_PROJECT_DIR;

      let output;
      if (isGemini) {
        output = JSON.stringify({ systemMessage: context });
      } else if (isClaude) {
        output = JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            additionalContext: context,
          },
        });
      }
      if (output) process.stdout.write(output);
    }

    process.exit(0);
  } catch (e) {
    process.stderr.write(`[impact-assess-guard] error: ${e.message}\n`);
    process.exit(0);
  }
});
