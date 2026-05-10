import { execFile } from "node:child_process";
import type {
  ExtensionAPI,
  ExtensionContext,
  SessionBeforeCompactEvent,
  ToolResultEvent,
} from "@earendil-works/pi-coding-agent";

type OmniHookOutput = {
  hookSpecificOutput?: {
    hookEventName?: string;
    updatedResponse?: string;
    additionalContext?: string;
    systemPromptAddition?: string;
  };
};

const OMNI_TIMEOUT_MS = 10_000;
const OMNI_MAX_BUFFER = 1024 * 1024;

let pendingSystemPromptAddition: string | undefined;

function runOmni(args: string[], payload: unknown): Promise<OmniHookOutput | undefined> {
  return new Promise((resolve) => {
    const child = execFile(
      "omni",
      args,
      {
        env: { ...process.env, OMNI_AGENT_ID: "pi" },
        timeout: OMNI_TIMEOUT_MS,
        maxBuffer: OMNI_MAX_BUFFER,
      },
      (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(undefined);
          return;
        }

        try {
          resolve(JSON.parse(stdout) as OmniHookOutput);
        } catch {
          resolve(undefined);
        }
      },
    );

    child.stdin?.end(JSON.stringify(payload));
  });
}

function sessionPayload(ctx: ExtensionContext, hookEventName: "SessionStart" | "PreCompact", extra?: Record<string, unknown>) {
  return {
    hookEventName,
    sessionId: ctx.sessionManager.getSessionId(),
    workingDirectory: ctx.cwd,
    ...extra,
  };
}

function textFromContent(event: ToolResultEvent): string {
  return event.content
    .map((item) => (item.type === "text" ? item.text : `[${item.type} content omitted]`))
    .join("\n");
}

function toolNameForOmni(toolName: string): string {
  if (toolName === "bash") return "Bash";
  if (toolName === "read") return "Read";
  if (toolName === "grep") return "Grep";
  if (toolName === "find") return "Find";
  if (toolName === "ls") return "LS";
  if (toolName === "edit") return "Edit";
  if (toolName === "write") return "Write";
  return toolName;
}

function toolResponseForOmni(event: ToolResultEvent) {
  const text = textFromContent(event);

  if (event.toolName === "bash") {
    return {
      stdout: event.isError ? "" : text,
      stderr: event.isError ? text : "",
      interrupted: false,
    };
  }

  return { content: text };
}

async function runSessionStart(ctx: ExtensionContext) {
  const result = await runOmni(["--session-start"], sessionPayload(ctx, "SessionStart"));
  const addition = result?.hookSpecificOutput?.systemPromptAddition?.trim();
  if (addition) pendingSystemPromptAddition = addition;
}

async function runPreCompact(event: SessionBeforeCompactEvent, ctx: ExtensionContext) {
  const result = await runOmni(
    ["--pre-compact"],
    sessionPayload(ctx, "PreCompact", {
      compactionReason: event.preparation.isSplitTurn ? "split_turn" : "limit_reached",
    }),
  );
  const addition = result?.hookSpecificOutput?.systemPromptAddition?.trim();
  if (addition) {
    pendingSystemPromptAddition = [pendingSystemPromptAddition, addition].filter(Boolean).join("\n\n");
  }
}

async function runPostTool(event: ToolResultEvent) {
  // Omni intentionally passes mutation tools through; avoid subprocess overhead.
  if (["edit", "write"].includes(event.toolName)) return undefined;

  const result = await runOmni(["--post-hook"], {
    tool_name: toolNameForOmni(event.toolName),
    tool_input: event.input,
    tool_response: toolResponseForOmni(event),
  });

  const output = result?.hookSpecificOutput;
  const updatedResponse = output?.updatedResponse?.trim();
  if (!updatedResponse) return undefined;

  const text = [updatedResponse, output?.additionalContext].filter(Boolean).join("\n\n");
  return {
    content: [{ type: "text" as const, text }],
  };
}

export default function omniExtension(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    await runSessionStart(ctx);
  });

  pi.on("before_agent_start", async (event) => {
    if (!pendingSystemPromptAddition) return undefined;

    const systemPrompt = `${event.systemPrompt}\n\n${pendingSystemPromptAddition}`;
    pendingSystemPromptAddition = undefined;
    return { systemPrompt };
  });

  pi.on("session_before_compact", async (event, ctx) => {
    await runPreCompact(event, ctx);
  });

  pi.on("tool_result", async (event) => runPostTool(event));
}
