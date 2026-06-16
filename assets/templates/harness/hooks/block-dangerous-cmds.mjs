#!/usr/bin/env node
// .harness/hooks/block-dangerous-cmds.mjs
// 拦截危险的 shell 命令（PreToolUse Bash → exit 2 阻断）。
// 覆盖: rm -rf 危险目标(根/home/通配/当前上级目录)、git reset --hard、git clean、
//       git push(含 -f/--force/--force-with-lease)、curl|sh/wget|bash 远程执行、chmod -R 777、
//       dd 写块设备、mkfs、find / -delete、fork bomb、DROP/TRUNCATE TABLE、DROP DATABASE。
// 注意: 这是「常见误操作拦截」，非完整沙箱；变量/alias/heredoc 等复杂绕过无法覆盖。

const chunks = [];
process.stdin.on("data", (c) => chunks.push(c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const toolInput = input.tool_input || {};
    const command = toolInput.command || "";

    // rm 递归+强制删除的 flag 检测（任意顺序，可合并 -rf 或分开 -r -f）
    const RM_RF =
      "(?:-[a-z]*r[a-z]*f[a-z]*|-[a-z]*f[a-z]*r[a-z]*|-r[a-z]*\\s+[^|;]*-f[a-z]*|-f[a-z]*\\s+[^|;]*-r[a-z]*)";

    const rules = [
      // === rm 危险目标（具体子目录如 node_modules 放行）===
      {
        pattern: new RegExp(`\\brm\\s+[^|;]*?${RM_RF}[^|;]*?\\s+/(\\s|$)`, "i"),
        msg: "rm -rf 根目录删除被阻止",
      },
      {
        pattern: new RegExp(`\\brm\\s+[^|;]*?${RM_RF}[^|;]*?\\s+(~|\\$HOME)(/|\\s|$)`, "i"),
        msg: "rm -rf home 目录删除被阻止",
      },
      {
        pattern: new RegExp(`\\brm\\s+[^|;]*?${RM_RF}[^|;]*?\\s+(\\.\\.?(/|\\s|$)|\\*(\\s|$))`, "i"),
        msg: "rm -rf 通配/当前/上级目录删除被阻止",
      },
      // rm -rf 系统关键目录（/etc、/usr、/var 等；裸 / 由上一条覆盖）
      {
        pattern: new RegExp(
          `\\brm\\s+[^|;]*?${RM_RF}[^|;]*?\\s+/(bin|boot|dev|etc|lib|lib32|lib64|proc|root|run|sbin|sys|usr|var)(/|\\s|$)`,
          "i",
        ),
        msg: "rm -rf 系统关键目录删除被阻止",
      },
      // === git 危险操作（force 检测在通用 push 之前，错误信息更准确）===
      { pattern: /\bgit\s+reset\s+[^|;]*--hard/i, msg: "git reset --hard 会丢失未提交更改，被阻止" },
      { pattern: /\bgit\s+clean\s+[^|;]*-[fd]/i, msg: "git clean -f 会删除未追踪文件，被阻止" },
      {
        pattern: /\bgit\s+push\s+[^|;]*?(-f\b|--force\b|--force-with-lease\b)/i,
        msg: "git push --force 被阻止。如需强制推送，请手动执行",
      },
      {
        pattern: /\bgit\s+push\b/i,
        msg: "自动 git push 被阻止。Push 必须由用户手动执行（参见 .harness/rules/auto-commit-workflow.md）",
      },
      // === 远程脚本管道执行 ===
      {
        pattern: /\b(curl|wget)\b[^|;]*\|\s*(sh|bash|zsh|fish)\b/i,
        msg: "远程脚本管道执行（curl|sh 等）被阻止。请先下载审查再执行",
      },
      // === 权限 ===
      {
        pattern: /\bchmod\b[^|;]*?(-R|--recursive)[^|;]*?\s+0?777\b/i,
        msg: "chmod -R 777 被阻止（全局可写有安全风险）",
      },
      // === 块设备 / 格式化 / 全盘删除 ===
      { pattern: /\bdd\b[^|;]*?of=\/dev\/(sd|nvme|disk|hd|mmcblk)/i, msg: "dd 写块设备被阻止（可能抹盘）" },
      { pattern: /\bmkfs(\.\w+)?\b[^|;]*?\/dev\//i, msg: "mkfs 格式化设备被阻止" },
      { pattern: /\bfind\b[^|;]*?\s\/\s[^|;]*?-delete/i, msg: "find / -delete 被阻止" },
      // === fork bomb ===
      { pattern: /:\s*\(\s*\)\s*\{\s*:\s*\|/i, msg: "fork bomb 被阻止" },
      // === SQL 危险操作 ===
      { pattern: /\bDROP\s+TABLE\b/i, msg: "DROP TABLE SQL 命令被阻止" },
      { pattern: /\bTRUNCATE\s+TABLE\b/i, msg: "TRUNCATE TABLE SQL 命令被阻止" },
      { pattern: /\bDROP\s+DATABASE\b/i, msg: "DROP DATABASE SQL 命令被阻止" },
    ];

    for (const { pattern, msg } of rules) {
      if (pattern.test(command)) {
        process.stderr.write(
          `[安全拦截] ${msg}\n命令: ${command.substring(0, 300)}\n`,
        );
        process.exit(2);
      }
    }

    process.exit(0);
  } catch (e) {
    process.stderr.write(`[block-dangerous-cmds] error: ${e.message}\n`);
    process.exit(0);
  }
});
