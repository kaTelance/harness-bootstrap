#!/usr/bin/env node
// .harness/hooks/auto-check.mjs
// Gate: G7 实施执行质量
// 代码文件修改后，按语言自动运行编译/类型检查，将错误反馈给 AI（PostToolUse async）。
// 运行时探测语言（无需项目画像注入）:
//   .rs + Cargo.toml         → cargo check --workspace
//   .ts/.tsx + tsconfig.json → npx tsc --noEmit
//   .go + go.mod             → go build ./...
//   .py + pyproject.toml     → python -m py_compile <file>
//
// 性能权衡: async=true 意味着 Claude Code 不阻塞等待本 hook，编译错误会在下一轮注入而非
// 即时阻断。代价是每次 Write/Edit 都跑全量编译（cargo check --workspace / tsc --noEmit），
// 大型项目上较慢。若编译耗时显著，可在 .claude/settings.json 中收紧 matcher 或调小 timeoutMs。

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const toolInput = input.tool_input || {};
    const filePath = (toolInput.file_path || toolInput.path || "").replace(/\\/g, "/");
    const ext = filePath.split(".").pop()?.toLowerCase() || "";

    const projectDir = (
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.GEMINI_PROJECT_DIR ||
      process.env.QODERCN_PROJECT_DIR ||
      input.cwd ||
      ""
    )
      .replace(/\\/g, "/")
      .replace(/\/$/, "");

    let cmd = null;
    let label = "";

    if (ext === "rs" && existsSync(`${projectDir}/Cargo.toml`)) {
      cmd = "cargo check --workspace 2>&1";
      label = "Rust (cargo check)";
    } else if ((ext === "ts" || ext === "tsx") && existsSync(`${projectDir}/tsconfig.json`)) {
      cmd = "npx tsc --noEmit 2>&1";
      label = "TypeScript (tsc)";
    } else if (ext === "go" && existsSync(`${projectDir}/go.mod`)) {
      cmd = "go build ./... 2>&1";
      label = "Go (go build)";
    } else if (
      ext === "py" &&
      (existsSync(`${projectDir}/pyproject.toml`) || existsSync(`${projectDir}/requirements.txt`))
    ) {
      // 防命令注入：含 shell 元字符 / 命令替换特征的路径不编译
      if (/["`$;&|<>(){}\n\r]/.test(filePath)) {
        process.exit(0);
        return;
      }
      cmd = `python -m py_compile "${filePath}" 2>&1`;
      label = "Python (py_compile)";
    }

    if (!cmd) {
      process.exit(0);
      return;
    }

    let output = "";
    let hasError = false;
    try {
      output = execSync(cmd, {
        timeout: 120000,
        encoding: "utf8",
        windowsHide: true,
        cwd: projectDir || undefined,
      });
    } catch (e) {
      output = (e.stdout || "") + (e.stderr || "") + (e.message || "");
      hasError = true;
    }

    if (hasError) {
      const tail = output.split("\n").slice(-25).join("\n");
      const context =
        `[G7 ${label}] 检查发现问题:\n\`\`\`\n${tail}\n\`\`\`\n` +
        `请修复错误后再继续。`;

      const isGemini = !!process.env.GEMINI_PROJECT_DIR && !process.env.QODER_IDE;
      const isClaude = !!process.env.CLAUDE_PROJECT_DIR;

      let jsonOutput;
      if (isGemini) {
        jsonOutput = JSON.stringify({ systemMessage: context });
      } else if (isClaude) {
        jsonOutput = JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PostToolUse",
            additionalContext: context,
          },
        });
      }
      if (jsonOutput) process.stdout.write(jsonOutput);
    }

    process.exit(0);
  } catch (e) {
    process.stderr.write(`[auto-check] error: ${e.message}\n`);
    process.exit(0);
  }
});
