import { basename } from "node:path";
import type { InputRequest, UrlProjectId } from "@yep-anywhere/shared";
import type { SessionMetadataService } from "../metadata/index.js";
import type { ServerSettingsService } from "../services/ServerSettingsService.js";
import type { Supervisor } from "../supervisor/Supervisor.js";
import { decodeProjectId } from "../supervisor/types.js";
import type {
  BusEvent,
  EventBus,
  MessageQueuedEvent,
  SessionPausedEvent,
} from "../watcher/index.js";

type AutomationEventType =
  | "tool-approval"
  | "user-question"
  | "session-paused"
  | "message-queued";

interface AutomationProjectContext {
  id: string;
  name: string;
  path: string;
}

interface AutomationSessionContext {
  id: string;
  lastUserMessageText?: string;
  queuedMessageText?: string;
  queuedCommandName?: string;
  queuedCommandArgs?: string[];
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

interface AutomationMessageQueuedEvent extends AutomationBaseEvent {
  type: "message-queued";
}

type AutomationEvent =
  | AutomationInputEvent
  | AutomationSessionPausedEvent
  | AutomationMessageQueuedEvent;

interface AutomationWebhookRequest {
  event: AutomationEvent;
  dryRun: boolean;
  context: {
    globalInstructions?: string;
    sessionVariables: Record<string, unknown>;
  };
}

interface AutomationServiceOptions {
  eventBus: EventBus;
  supervisor: Supervisor;
  serverSettingsService: ServerSettingsService;
  sessionMetadataService?: SessionMetadataService;
}

export class AutomationService {
  private readonly eventBus: EventBus;
  private readonly supervisor: Supervisor;
  private readonly serverSettingsService: ServerSettingsService;
  private readonly sessionMetadataService?: SessionMetadataService;
  private readonly unsubscribe: () => void;

  constructor(options: AutomationServiceOptions) {
    this.eventBus = options.eventBus;
    this.supervisor = options.supervisor;
    this.serverSettingsService = options.serverSettingsService;
    this.sessionMetadataService = options.sessionMetadataService;

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
    await this.executeWebhook(normalized);
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

    if (event.type === "message-queued") {
      if (event.source === "automation") {
        return null;
      }
      return this.buildMessageQueuedEvent(event);
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

  private async executeWebhook(event: AutomationEvent): Promise<void> {
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

    const webhookUrl = settings.automationWebhookUrl?.trim();
    if (!webhookUrl) {
      return;
    }

    const dryRun = settings.automationDryRun ?? true;
    const requestBody: AutomationWebhookRequest = {
      event,
      dryRun,
      context: {
        globalInstructions:
          this.serverSettingsService.getSetting("globalInstructions") ??
          undefined,
        sessionVariables:
          this.sessionMetadataService?.getSessionVariables(event.session.id) ??
          {},
      },
    };

    const headers = new Headers({
      "content-type": "application/json",
    });
    const token = settings.automationWebhookToken?.trim();
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error("[Automation] Webhook failed:", response.status);
        return;
      }
    } catch (error) {
      console.error("[Automation] Webhook execution failed:", error);
    }
  }

  private buildMessageQueuedEvent(
    event: MessageQueuedEvent,
  ): AutomationMessageQueuedEvent | null {
    const process = this.supervisor.getProcessForSession(event.sessionId);
    const projectPath = this.resolveProjectPath(
      event.sessionId,
      event.projectId,
    );
    if (!projectPath) {
      return null;
    }

    const parsedCommand = this.parseCommandText(event.text);
    return {
      type: "message-queued",
      timestamp: event.timestamp,
      project: {
        id: event.projectId,
        name: basename(projectPath),
        path: projectPath,
      },
      session: {
        id: event.sessionId,
        lastUserMessageText: process
          ? this.extractLastUserMessageText(process)
          : event.text,
        queuedMessageText: event.text,
        queuedCommandName: parsedCommand?.name,
        queuedCommandArgs: parsedCommand?.args,
      },
      process: {
        id: event.processId ?? process?.id,
        provider: event.provider ?? process?.provider,
        permissionMode: process?.permissionMode,
        model: process?.resolvedModel,
        executor: process?.executor,
      },
    };
  }

  private parseCommandText(
    text: string | undefined,
  ): { name: string; args: string[] } | null {
    const trimmed = text?.trim();
    if (!trimmed?.startsWith("/")) {
      return null;
    }

    const body = trimmed.slice(1).trim();
    if (!body) {
      return null;
    }

    const parts = body.split(/\s+/).filter(Boolean);
    const [name, ...args] = parts;
    if (!name) {
      return null;
    }

    return { name, args };
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
