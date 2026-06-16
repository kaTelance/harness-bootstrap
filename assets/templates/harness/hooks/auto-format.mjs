#!/usr/bin/env node
// .harness/hooks/auto-format.mjs
// Gate: G7 实施执行质量
// Write/Edit 后按语言自动格式化（PostToolUse sync）
//   .ts/.tsx/.js/.jsx/.json/.css/.md → prettier --write（项目装了才跑）
//   .rs                              → cargo fmt --all
//   .go                              → gofmt -w
// 注意:
//   - 治理文件（.harness/**、.claude/**、CLAUDE.md、AGENTS.md）不格式化，保护闸门表格与治理文档结构。
//   - filePath 含 shell 元字符 / 命令替换特征时跳过格式化（防命令注入）。
//   - 保留 execSync 走 shell，以便跨平台解析 npx/cargo/gofmt（npx 在 Windows 是 .cmd）。

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const toolInput = input.tool_input || {};
    const filePath = (toolInput.file_path || toolInput.path || "").replace(/\\/g, "/");

    if (!filePath || !existsSync(filePath)) {
      process.exit(0);
      return;
    }

    // 治理文件不格式化（保护闸门表格 / 治理文档结构）
    if (
      filePath.includes("/.harness/") ||
      filePath.includes("/.claude/") ||
      /\/CLAUDE\.md$/.test(filePath) ||
      /\/AGENTS\.md$/.test(filePath)
    ) {
      process.exit(0);
      return;
    }

    const ext = filePath.split(".").pop()?.toLowerCase() || "";

    // 防命令注入：filePath 含 shell 元字符 / 命令替换特征一律跳过格式化
    const safePath = !/["`$;&|<>(){}\n\r]/.test(filePath);

    const tryRun = (cmd, timeoutMs) => {
      try {
        execSync(cmd, { timeout: timeoutMs, stdio: "pipe", windowsHide: true });
      } catch (e) {
        process.stderr.write(
          `[auto-format] warning on ${filePath}: ${String(e.message).substring(0, 200)}\n`,
        );
      }
    };

    const prettierExts = new Set(["ts", "tsx", "js", "jsx", "json", "css", "md"]);
    if (prettierExts.has(ext) && safePath) {
      tryRun(`npx prettier --write "${filePath}"`, 15000);
    }
    if (ext === "rs") {
      // cargo fmt 作用于整个 workspace，不涉及 filePath，无注入面
      tryRun("cargo fmt --all", 30000);
    }
    if (ext === "go" && safePath) {
      tryRun(`gofmt -w "${filePath}"`, 15000);
    }

    process.exit(0);
  } catch (e) {
    process.stderr.write(`[auto-format] error: ${e.message}\n`);
    process.exit(0);
  }
});
