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

type AutomationAction =
  | { type: "approve" }
  | { type: "deny"; feedback?: string }
  | { type: "answer"; answers: Record<string, string>; feedback?: string }
  | { type: "send-message"; text: string }
  | { type: "send-command"; command: string; args?: string | string[] }
  | {
      type: "resume";
      message: string;
      projectPath?: string;
      projectId?: string;
    }
  | { type: "set-global-instructions"; text?: string }
  | { type: "append-global-instructions"; text: string; separator?: string }
  | { type: "clear-global-instructions" }
  | { type: "set-session-variable"; key: string; value: unknown }
  | { type: "set-session-variables"; variables: Record<string, unknown> }
  | { type: "clear-session-variables" };

interface AutomationWebhookRequest {
  event: AutomationEvent;
  dryRun: boolean;
  context: {
    globalInstructions?: string;
    sessionVariables: Record<string, unknown>;
  };
}

interface AutomationWebhookResponse {
  actions?: AutomationAction[];
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

      const body = (await response.json()) as AutomationWebhookResponse;
      const actions = Array.isArray(body.actions) ? body.actions : [];
      for (const action of actions) {
        await this.executeAction(event, action, dryRun);
      }
    } catch (error) {
      console.error("[Automation] Webhook execution failed:", error);
    }
  }

  private async executeAction(
    event: AutomationEvent,
    action: AutomationAction,
    dryRun: boolean,
  ): Promise<void> {
    switch (action.type) {
      case "approve": {
        this.assertInputEvent(event, "approve");
        if (dryRun) {
          console.log("[Automation] dry-run approve", event.session.id);
          return;
        }
        const process = this.supervisor.getProcessForSession(event.session.id);
        process?.respondToInput(event.tool.request.id, "approve", undefined);
        return;
      }
      case "deny": {
        this.assertInputEvent(event, "deny");
        if (dryRun) {
          console.log(
            "[Automation] dry-run deny",
            event.session.id,
            action.feedback,
          );
          return;
        }
        const process = this.supervisor.getProcessForSession(event.session.id);
        process?.respondToInput(
          event.tool.request.id,
          "deny",
          undefined,
          action.feedback,
        );
        return;
      }
      case "answer": {
        this.assertInputEvent(event, "answer");
        if (dryRun) {
          console.log(
            "[Automation] dry-run answer",
            event.session.id,
            action.answers,
          );
          return;
        }
        const process = this.supervisor.getProcessForSession(event.session.id);
        process?.respondToInput(
          event.tool.request.id,
          "approve",
          action.answers,
          action.feedback,
        );
        return;
      }
      case "send-message": {
        await this.queueSessionMessage(event, action.text, dryRun);
        return;
      }
      case "send-command": {
        await this.queueSessionMessage(
          event,
          this.formatCommandMessage(action.command, action.args),
          dryRun,
        );
        return;
      }
      case "resume": {
        const projectPath =
          action.projectPath ??
          this.resolveProjectPath(
            event.session.id,
            (action.projectId ?? event.project.id) as UrlProjectId,
          );
        if (!projectPath) {
          return;
        }
        if (dryRun) {
          console.log(
            "[Automation] dry-run resume",
            event.session.id,
            projectPath,
            action.message,
          );
          return;
        }
        await this.supervisor.resumeSession(event.session.id, projectPath, {
          text: action.message,
        });
        return;
      }
      case "set-global-instructions": {
        const value = this.normalizeGlobalInstructions(action.text);
        if (dryRun) {
          console.log("[Automation] dry-run setGlobalInstructions", value);
          return;
        }
        await this.serverSettingsService.updateSettings({
          globalInstructions: value,
        });
        return;
      }
      case "append-global-instructions": {
        const addition = this.normalizeGlobalInstructions(action.text);
        const current = this.normalizeGlobalInstructions(
          this.serverSettingsService.getSetting("globalInstructions"),
        );
        const value = addition
          ? [current, addition]
              .filter(Boolean)
              .join(action.separator ?? "\n\n")
              .trim()
          : current;
        if (dryRun) {
          console.log("[Automation] dry-run appendGlobalInstructions", value);
          return;
        }
        await this.serverSettingsService.updateSettings({
          globalInstructions: value || undefined,
        });
        return;
      }
      case "clear-global-instructions": {
        if (dryRun) {
          console.log("[Automation] dry-run clearGlobalInstructions");
          return;
        }
        await this.serverSettingsService.updateSettings({
          globalInstructions: undefined,
        });
        return;
      }
      case "set-session-variable": {
        this.ensureSessionMetadataService();
        const key = action.key.trim();
        if (!key) {
          throw new Error("set-session-variable requires a key");
        }
        if (dryRun) {
          console.log(
            "[Automation] dry-run setSessionVariable",
            event.session.id,
            key,
            action.value,
          );
          return;
        }
        await this.getSessionMetadataService().setSessionVariable(
          event.session.id,
          key,
          action.value,
        );
        return;
      }
      case "set-session-variables": {
        this.ensureSessionMetadataService();
        if (dryRun) {
          console.log(
            "[Automation] dry-run setSessionVariables",
            event.session.id,
            action.variables,
          );
          return;
        }
        await this.getSessionMetadataService().setSessionVariables(
          event.session.id,
          action.variables,
        );
        return;
      }
      case "clear-session-variables": {
        this.ensureSessionMetadataService();
        if (dryRun) {
          console.log(
            "[Automation] dry-run clearSessionVariables",
            event.session.id,
          );
          return;
        }
        await this.getSessionMetadataService().clearSessionVariables(
          event.session.id,
        );
        return;
      }
    }
  }

  private assertInputEvent(
    event: AutomationEvent,
    action: string,
  ): asserts event is AutomationInputEvent {
    if (event.type !== "tool-approval" && event.type !== "user-question") {
      throw new Error(`${action} is only valid for pending input events`);
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

  private async queueSessionMessage(
    event: AutomationEvent,
    text: string,
    dryRun: boolean,
  ): Promise<void> {
    const projectPath = this.resolveProjectPath(
      event.session.id,
      event.project.id as UrlProjectId,
    );
    if (!projectPath) {
      return;
    }
    if (dryRun) {
      console.log("[Automation] dry-run queueMessage", event.session.id, text);
      return;
    }

    await this.supervisor.queueMessageToSession(
      event.session.id,
      projectPath,
      { text },
      undefined,
      undefined,
      { source: "automation" },
    );
  }

  private formatCommandMessage(
    command: string,
    args?: string | string[],
  ): string {
    const normalizedCommand = command.trim().replace(/^\/+/, "");
    if (!normalizedCommand) {
      throw new Error("send-command requires a command name");
    }

    const formattedArgs = Array.isArray(args)
      ? args
          .map((value) => value.trim())
          .filter(Boolean)
          .join(" ")
      : args?.trim();

    return formattedArgs
      ? `/${normalizedCommand} ${formattedArgs}`
      : `/${normalizedCommand}`;
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

  private normalizeGlobalInstructions(
    text: string | undefined,
  ): string | undefined {
    const normalized = text?.trim();
    return normalized ? normalized.slice(0, 10_000) : undefined;
  }

  private ensureSessionMetadataService(): void {
    if (!this.sessionMetadataService) {
      throw new Error(
        "session metadata service is not available for session variable helpers",
      );
    }
  }

  private getSessionMetadataService(): SessionMetadataService {
    const sessionMetadataService = this.sessionMetadataService;
    if (!sessionMetadataService) {
      throw new Error(
        "session metadata service is not available for session variable helpers",
      );
    }
    return sessionMetadataService;
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
