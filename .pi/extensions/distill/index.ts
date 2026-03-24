import { randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";

interface DistillConfig {
  enabled: boolean;
  intervalMinutes: number;
}

const DEFAULT_CONFIG: DistillConfig = {
  enabled: false,
  intervalMinutes: 60,
};

function loadDistillConfig(vaultPath: string): DistillConfig {
  const configPath = path.join(vaultPath, "config.json");
  if (!fs.existsSync(configPath)) return DEFAULT_CONFIG;
  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const distill = raw.distill || {};
    return { ...DEFAULT_CONFIG, ...distill };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function findVaultPath(cwd: string): string | null {
  let dir = cwd;
  while (dir !== path.dirname(dir)) {
    const napkinDir = path.join(dir, ".napkin");
    if (fs.existsSync(napkinDir)) {
      return napkinDir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

const DEFAULT_AGENT_CONTENT = `---
name: napkin-distill
description: Auto-distills conversation knowledge into the napkin vault
model: claude-sonnet-4-6
thinking: off
tools: read, write, bash, edit, find, grep
---
Distill this conversation into the napkin vault.

1. \`napkin overview\` — learn the vault structure and what exists
2. \`napkin template list\` and \`napkin template read\` — learn the note formats
3. Identify what's worth capturing. The vault structure and templates tell you what kinds of notes belong.
4. For each note:
   a. Use \`scripts/napkin-search\` for the topic — if a note already covers it, \`napkin append\` instead of creating a duplicate
   b. Create new notes with \`napkin create\`, following the template format
   c. Add \`[[wikilinks]]\` to related notes

Be selective. Only capture knowledge useful to someone working on this project later. Skip meta-discussion, tool output, and chatter.`;

function ensureAgentFile(cwd: string) {
  const agentsDir = path.join(cwd, ".pi", "agents");
  const agentPath = path.join(agentsDir, "napkin-distill.md");
  if (!fs.existsSync(agentPath)) {
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(agentPath, DEFAULT_AGENT_CONTENT, "utf-8");
  }
}

export default function (pi: ExtensionAPI) {
  let intervalHandle: ReturnType<typeof setInterval> | null = null;
  let lastSessionSize = 0;
  let activeRequestId: string | null = null;

  pi.on("session_start", async (_event, ctx) => {
    const vaultPath = findVaultPath(ctx.cwd);
    if (!vaultPath) return;

    ensureAgentFile(ctx.cwd);

    const config = loadDistillConfig(vaultPath);
    if (!config.enabled) {
      if (ctx.hasUI) {
        const theme = ctx.ui.theme;
        ctx.ui.setStatus("napkin-distill", theme.fg("dim", "distill: off"));
      }
      return;
    }

    const intervalMs = config.intervalMinutes * 60 * 1000;

    intervalHandle = setInterval(() => {
      if (activeRequestId) return;
      runDistill(ctx).catch((err) => {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `Distill error: ${err instanceof Error ? err.message : String(err)}`,
            "error",
          );
        }
      });
    }, intervalMs);
  });

  pi.on("session_shutdown", async () => {
    if (intervalHandle) {
      clearInterval(intervalHandle);
      intervalHandle = null;
    }
  });

  // Listen for the completion of the async subagent run
  pi.events.on("subagent:complete", (data: unknown) => {
    if (
      data &&
      typeof data === "object" &&
      "id" in data &&
      data.id === activeRequestId
    ) {
      activeRequestId = null;
      if ("success" in data && data.success) {
      }
    }
  });

  async function runDistill(ctx: ExtensionContext) {
    const vaultPath = findVaultPath(ctx.cwd);
    if (!vaultPath) return;

    const sessionFile = ctx.sessionManager.getSessionFile?.();
    if (!sessionFile) {
      if (ctx.hasUI)
        ctx.ui.notify(
          "Distill: no session file (ephemeral session)",
          "warning",
        );
      return;
    }

    // Skip if session hasn't changed since last distill
    const currentSize = fs.existsSync(sessionFile)
      ? fs.statSync(sessionFile).size
      : 0;
    if (currentSize > 0 && currentSize === lastSessionSize) {
      return;
    }

    ensureAgentFile(ctx.cwd);

    activeRequestId = `distill-${Date.now()}-${randomUUID().slice(0, 8)}`;
    lastSessionSize = currentSize;

    pi.events.emit("subagent:slash:request", {
      requestId: activeRequestId,
      params: {
        agent: "napkin-distill",
        context: "fork",
        async: true,
        clarify: false,
        model: `${loadDistillConfig(vaultPath).model.provider}/${loadDistillConfig(vaultPath).model.id}`,
      },
    });

    if (ctx.hasUI) {
      ctx.ui.notify("Distillation started in background.", "info");
    }
  }

  // Manual trigger
  pi.registerCommand("distill", {
    description: "Distill conversation knowledge into the vault via subagent",
    handler: async (_args, ctx) => {
      const vaultPath = findVaultPath(ctx.cwd);
      if (!vaultPath) {
        if (ctx.hasUI) ctx.ui.notify("No vault found", "error");
        return;
      }

      if (activeRequestId) {
        if (ctx.hasUI) ctx.ui.notify("Distill already running", "warning");
        return;
      }

      // Bypass size check for manual trigger
      lastSessionSize = 0;

      runDistill(ctx).catch((err) => {
        if (ctx.hasUI) {
          ctx.ui.notify(
            `Distill error: ${err instanceof Error ? err.message : String(err)}`,
            "error",
          );
        }
      });
    },
  });
}
