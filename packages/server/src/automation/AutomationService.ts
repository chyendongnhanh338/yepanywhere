import { basename } from "node:path";
import vm from "node:vm";
import type { InputRequest, UrlProjectId } from "@yep-anywhere/shared";
import type { ServerSettingsService } from "../services/ServerSettingsService.js";
import type { Supervisor } from "../supervisor/Supervisor.js";
import { decodeProjectId } from "../supervisor/types.js";
import type {
  BusEvent,
  EventBus,
  SessionPausedEvent,
} from "../watcher/index.js";

type AutomationEventType = "tool-approval" | "user-question" | "session-paused";

interface AutomationProjectContext {
  id: string;
  name: string;
  path: string;
}

interface AutomationSessionContext {
  id: string;
  lastUserMessageText?: string;
}

interface AutomationProcessContext {
  id?: string;
  provider?: string;
  model?: string;
  executor?: string;
  permissionMode?: string;
}

interface AutomationToolContext {
  request: InputRequest;
  summary: string;
  toolName?: string;
}

interface AutomationBaseEvent {
  type: AutomationEventType;
  timestamp: string;
  project: AutomationProjectContext;
  session: AutomationSessionContext;
  process: AutomationProcessContext;
}

interface AutomationInputEvent extends AutomationBaseEvent {
  type: "tool-approval" | "user-question";
  tool: AutomationToolContext;
}

interface AutomationSessionPausedEvent extends AutomationBaseEvent {
  type: "session-paused";
  reason: SessionPausedEvent["reason"];
  summary?: string;
  lastMessageText?: string;
}

type AutomationEvent = AutomationInputEvent | AutomationSessionPausedEvent;

interface AutomationActions {
  approve: () => Promise<{ ok: boolean; dryRun: boolean }>;
  deny: (feedback?: string) => Promise<{ ok: boolean; dryRun: boolean }>;
  answer: (
    answers: Record<string, string>,
    feedback?: string,
  ) => Promise<{ ok: boolean; dryRun: boolean }>;
  sendMessage: (text: string) => Promise<{ ok: boolean; dryRun: boolean }>;
  resume: (
    message: string,
    options?: { projectPath?: string; projectId?: string },
  ) => Promise<{ ok: boolean; dryRun: boolean }>;
}

interface AutomationContext {
  event: AutomationEvent;
  log: (...args: unknown[]) => void;
  http: {
    fetch: typeof fetch;
    request<T = unknown>(
      input: string | URL | Request,
      init?: RequestInit & { json?: unknown; raw?: false },
    ): Promise<T>;
    request(
      input: string | URL | Request,
      init: RequestInit & { json?: unknown; raw: true },
    ): Promise<Response>;
  };
  actions: AutomationActions;
}

interface AutomationServiceOptions {
  eventBus: EventBus;
  supervisor: Supervisor;
  serverSettingsService: ServerSettingsService;
}

const SCRIPT_TIMEOUT_MS = 5000;

export class AutomationService {
  private readonly eventBus: EventBus;
  private readonly supervisor: Supervisor;
  private readonly serverSettingsService: ServerSettingsService;
  private readonly unsubscribe: () => void;

  constructor(options: AutomationServiceOptions) {
    this.eventBus = options.eventBus;
    this.supervisor = options.supervisor;
    this.serverSettingsService = options.serverSettingsService;

    this.unsubscribe = this.eventBus.subscribe((event) => {
      void this.handleBusEvent(event);
    });
  }

  dispose(): void {
    this.unsubscribe();
  }

  noteSessionPaused(
    event: Omit<SessionPausedEvent, "type" | "timestamp"> & {
      timestamp?: string;
    },
  ): void {
    this.eventBus.emit({
      type: "session-paused",
      timestamp: event.timestamp ?? new Date().toISOString(),
      ...event,
    });
  }

  private async handleBusEvent(event: BusEvent): Promise<void> {
    const normalized = this.normalizeEvent(event);
    if (!normalized) return;
    await this.executeCallback(normalized);
  }

  private normalizeEvent(event: BusEvent): AutomationEvent | null {
    if (event.type === "session-paused") {
      const process = this.supervisor.getProcessForSession(event.sessionId);
      const projectPath = this.resolveProjectPath(
        event.sessionId,
        event.projectId,
      );
      if (!projectPath) {
        return null;
      }
      return {
        type: "session-paused",
        timestamp: event.timestamp,
        reason: event.reason,
        summary: event.summary,
        lastMessageText: event.lastMessageText,
        project: {
          id: event.projectId,
          name: basename(projectPath),
          path: projectPath,
        },
        session: {
          id: event.sessionId,
          lastUserMessageText: process
            ? this.extractLastUserMessageText(process)
            : undefined,
        },
        process: {
          id: event.processId,
          provider: event.provider,
          permissionMode: process?.permissionMode,
          model: process?.resolvedModel,
          executor: process?.executor,
        },
      };
    }

    if (event.type !== "process-state-changed") {
      return null;
    }

    if (event.activity !== "waiting-input" || !event.pendingInputType) {
      return null;
    }

    const process = this.supervisor.getProcessForSession(event.sessionId);
    if (!process || process.state.type !== "waiting-input") {
      return null;
    }

    const type: AutomationInputEvent["type"] =
      event.pendingInputType === "tool-approval"
        ? "tool-approval"
        : "user-question";

    return {
      type,
      timestamp: event.timestamp,
      project: {
        id: event.projectId,
        name: basename(process.projectPath),
        path: process.projectPath,
      },
      session: {
        id: event.sessionId,
        lastUserMessageText: this.extractLastUserMessageText(process),
      },
      process: {
        id: process.id,
        provider: process.provider,
        permissionMode: process.permissionMode,
        model: process.resolvedModel,
        executor: process.executor,
      },
      tool: {
        request: process.state.request,
        summary: this.buildSummary(process.state.request),
        toolName: process.state.request.toolName,
      },
    };
  }

  private async executeCallback(event: AutomationEvent): Promise<void> {
    const settings = this.serverSettingsService.getSettings();
    if (!settings.automationEnabled) {
      return;
    }

    const configuredTypes = settings.automationEventTypes;
    if (
      Array.isArray(configuredTypes) &&
      !configuredTypes.includes(event.type as AutomationEventType)
    ) {
      return;
    }

    const source = this.normalizeScriptSource(
      settings.automationScript?.trim(),
    );
    if (!source) {
      return;
    }

    const dryRun = settings.automationDryRun ?? true;

    try {
      const script = new vm.Script(
        `"use strict"; (async () => { ${source}\n; const __handler = typeof onEvent === "function" ? onEvent : (globalThis.default && typeof globalThis.default === "function" ? globalThis.default : null); if (!__handler) { throw new Error("automation script must define onEvent(ctx) or default(ctx)"); } return __handler; })()`,
        { filename: "automation-callback.js" },
      );

      const context = vm.createContext({
        console: this.buildConsole(),
        fetch,
        setTimeout,
        clearTimeout,
      });

      const handler = (await script.runInContext(context, {
        timeout: SCRIPT_TIMEOUT_MS,
      })) as (ctx: AutomationContext) => Promise<unknown> | unknown;

      await Promise.resolve(
        handler({
          event,
          log: (...args: unknown[]) => {
            console.log("[Automation]", ...args);
          },
          http: {
            fetch,
            request: this.request.bind(this),
          },
          actions: this.createActions(event, dryRun),
        }),
      );
    } catch (error) {
      console.error("[Automation] Callback execution failed:", error);
    }
  }

  private normalizeScriptSource(
    source: string | undefined,
  ): string | undefined {
    if (!source) return source;
    if (source.startsWith("export default")) {
      return source.replace(/^export default\s+/, "globalThis.default = ");
    }
    return source;
  }

  private buildConsole(): Pick<Console, "log" | "warn" | "error"> {
    return {
      log: (...args: unknown[]) => console.log("[Automation]", ...args),
      warn: (...args: unknown[]) => console.warn("[Automation]", ...args),
      error: (...args: unknown[]) => console.error("[Automation]", ...args),
    };
  }

  private request<T = unknown>(
    input: string | URL | Request,
    init?: RequestInit & { json?: unknown; raw?: false },
  ): Promise<T>;
  private request(
    input: string | URL | Request,
    init: RequestInit & { json?: unknown; raw: true },
  ): Promise<Response>;
  private async request<T = unknown>(
    input: string | URL | Request,
    init?: RequestInit & { json?: unknown; raw?: boolean },
  ): Promise<T | Response> {
    const { json, raw, headers, ...rest } = init ?? {};
    const requestHeaders = new Headers(headers);

    let body = rest.body;
    if (json !== undefined) {
      body = JSON.stringify(json);
      if (!requestHeaders.has("content-type")) {
        requestHeaders.set("content-type", "application/json");
      }
    }

    const response = await fetch(input, {
      ...rest,
      headers: requestHeaders,
      body,
    });

    if (raw) {
      return response;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    return (await response.text()) as T;
  }

  private createActions(
    event: AutomationEvent,
    dryRun: boolean,
  ): AutomationActions {
    return {
      approve: async () => {
        if (event.type !== "tool-approval" && event.type !== "user-question") {
          throw new Error("approve() is only valid for pending input events");
        }
        if (dryRun) {
          console.log("[Automation] dry-run approve", event.session.id);
          return { ok: true, dryRun: true };
        }
        const process = this.supervisor.getProcessForSession(event.session.id);
        const ok =
          !!process &&
          process.respondToInput(event.tool.request.id, "approve", undefined);
        return { ok, dryRun: false };
      },
      deny: async (feedback?: string) => {
        if (event.type !== "tool-approval" && event.type !== "user-question") {
          throw new Error("deny() is only valid for pending input events");
        }
        if (dryRun) {
          console.log("[Automation] dry-run deny", event.session.id, feedback);
          return { ok: true, dryRun: true };
        }
        const process = this.supervisor.getProcessForSession(event.session.id);
        const ok =
          !!process &&
          process.respondToInput(
            event.tool.request.id,
            "deny",
            undefined,
            feedback,
          );
        return { ok, dryRun: false };
      },
      answer: async (answers: Record<string, string>, feedback?: string) => {
        if (event.type !== "tool-approval" && event.type !== "user-question") {
          throw new Error("answer() is only valid for pending input events");
        }
        if (dryRun) {
          console.log("[Automation] dry-run answer", event.session.id, answers);
          return { ok: true, dryRun: true };
        }
        const process = this.supervisor.getProcessForSession(event.session.id);
        const ok =
          !!process &&
          process.respondToInput(
            event.tool.request.id,
            "approve",
            answers,
            feedback,
          );
        return { ok, dryRun: false };
      },
      sendMessage: async (text: string) => {
        const process = this.supervisor.getProcessForSession(event.session.id);
        if (!process) {
          return { ok: false, dryRun };
        }
        if (dryRun) {
          console.log(
            "[Automation] dry-run sendMessage",
            event.session.id,
            text,
          );
          return { ok: true, dryRun: true };
        }
        const result = process.queueMessage({ text });
        return { ok: result.success, dryRun: false };
      },
      resume: async (
        message: string,
        options?: { projectPath?: string; projectId?: string },
      ) => {
        const projectPath =
          options?.projectPath ??
          this.resolveProjectPath(
            event.session.id,
            options?.projectId ?? (event.project.id as UrlProjectId),
          );
        if (!projectPath) {
          return { ok: false, dryRun };
        }
        if (dryRun) {
          console.log(
            "[Automation] dry-run resume",
            event.session.id,
            projectPath,
            message,
          );
          return { ok: true, dryRun: true };
        }
        await this.supervisor.resumeSession(event.session.id, projectPath, {
          text: message,
        });
        return { ok: true, dryRun: false };
      },
    };
  }

  private resolveProjectPath(
    sessionId: string,
    projectId?: string,
  ): string | undefined {
    const process = this.supervisor.getProcessForSession(sessionId);
    if (process) {
      return process.projectPath;
    }
    if (!projectId) {
      return undefined;
    }
    try {
      return decodeProjectId(projectId as UrlProjectId);
    } catch {
      return undefined;
    }
  }

  private extractLastUserMessageText(process: {
    getMessageHistory(): Array<{
      type?: string;
      message?: { role?: string; content?: unknown };
    }>;
  }): string | undefined {
    const history = process.getMessageHistory();
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const message = history[index];
      if (!message) continue;
      if (message.type !== "user" && message.message?.role !== "user") {
        continue;
      }

      const content = message.message?.content;
      if (typeof content === "string" && content.trim()) {
        return content.trim();
      }

      if (Array.isArray(content)) {
        const textBlock = content.find(
          (block): block is { type: string; text?: string } =>
            !!block &&
            typeof block === "object" &&
            "type" in block &&
            "text" in block,
        );
        if (
          textBlock &&
          typeof textBlock.text === "string" &&
          textBlock.text.trim()
        ) {
          return textBlock.text.trim();
        }
      }
    }

    return undefined;
  }

  private buildSummary(request: InputRequest): string {
    if (request.type === "tool-approval") {
      const toolName = request.toolName ?? "Unknown tool";
      if (request.toolInput && typeof request.toolInput === "object") {
        const input = request.toolInput as Record<string, unknown>;
        const filePath = input.file_path ?? input.filePath ?? input.path;
        if (typeof filePath === "string") {
          return `${toolName}: ${basename(filePath)}`;
        }
      }
      return `Run: ${toolName}`;
    }

    const prompt = request.prompt ?? "Waiting for input";
    return prompt.length > 80 ? `${prompt.slice(0, 77)}...` : prompt;
  }
}
