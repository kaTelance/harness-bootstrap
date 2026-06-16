#!/usr/bin/env node
// .harness/hooks/protect-harness-files.mjs
// Gates: G6 架构延续 + G11 Harness 治理（提醒，不阻断）
// 对治理文件修改注入提醒（用户授权即可修改）。
// 覆盖: .harness/**, .claude/**, CLAUDE.md, AGENTS.md
// 路径前缀剥离与模式匹配均大小写不敏感（Windows 文件系统大小写不敏感）。

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const toolInput = input.tool_input || {};
    const filePath = (toolInput.file_path || toolInput.path || "").replace(/\\/g, "/");

    const projectDir = (
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.GEMINI_PROJECT_DIR ||
      process.env.QODERCN_PROJECT_DIR ||
      process.env.QODER_CWD ||
      input.cwd ||
      ""
    )
      .replace(/\\/g, "/")
      .replace(/\/$/, "");

    // 大小写不敏感地剥离 projectDir 前缀（Windows 文件系统大小写不敏感，
    // 直接字符串 replace 在大小写不一致时会漏判治理文件）
    let relPath = filePath;
    if (projectDir) {
      const escaped = projectDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      relPath = filePath.replace(new RegExp("^" + escaped, "i"), "").replace(/^\//, "");
    }

    // 模式匹配大小写不敏感
    const warnPatterns = [
      /^\.harness\//i,
      /^\.claude\//i,
      /^CLAUDE\.md$/i,
      /^AGENTS\.md$/i,
    ];

    const matched = warnPatterns.some((p) => p.test(relPath));

    if (matched) {
      const context =
        `[G6/G11 提醒] 你正在修改治理文件: ${relPath}\n` +
        `这是 harness 治理层变更。请确认: 修改意图明确、交叉引用同步、分层一致、导入链不断裂。\n` +
        `详见 .harness/gates/G11-harness-governance.md`;

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
    process.stderr.write(`[protect-harness-files] error: ${e.message}\n`);
    process.exit(0);
  }
});
