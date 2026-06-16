#!/usr/bin/env node
// .harness/hooks/plan-to-apply-checkpoint.mjs
// Gate: G3 Plan-to-Apply 检查站（提醒，不阻断）
// 在编辑/创建代码文件时注入 G4/G5 前置检查提醒
// 启发式匹配: 代码文件扩展名（无需项目画像注入）

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const toolName = (input.tool_name || "").toLowerCase();
    const toolInput = input.tool_input || {};
    const filePath = (toolInput.file_path || toolInput.path || "").replace(/\\/g, "/");
    const ext = filePath.split(".").pop()?.toLowerCase() || "";

    const isWrite = /^(write|create_file)$/.test(toolName);
    const isEdit = /^(edit|replace|search_replace)$/.test(toolName);
    if (!isWrite && !isEdit) {
      process.exit(0);
      return;
    }

    // 代码文件扩展名启发式（排除配置/文档/样式）
    const codeExts = new Set([
      "ts", "tsx", "js", "jsx", "mjs", "cjs",
      "rs", "go", "py", "java", "kt", "c", "cpp", "cc", "h", "hpp",
      "rb", "php", "swift", "scala", "cs",
    ]);

    if (!codeExts.has(ext)) {
      process.exit(0);
      return;
    }

    const shortPath = filePath.split("/").slice(-3).join("/");
    const action = isEdit ? "修改" : "创建";

    const context = [
      `[G3 Plan-to-Apply 检查站] 你正在${action}代码文件: ${shortPath}`,
      isEdit
        ? "这是对已有文件的修改。请确认已完成以下前置检查："
        : "请确认本次变更已完成以下前置检查：",
      "1. G4 影响评估（修改已有文件时必须）→ .harness/gates/G4-impact-assessment.md",
      "2. G5 代码影响深度审查（G4 通过后必须）→ .harness/gates/G5-code-impact-review.md",
      "3. Plan-to-Apply Checkpoint 签发 → .harness/gates/G3-plan-to-apply-checkpoint.md",
      "如果尚未完成，STOP，先执行检查站。",
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
    process.exit(0);
  } catch (e) {
    process.stderr.write(`[plan-to-apply-checkpoint] error: ${e.message}\n`);
    process.exit(0);
  }
});
