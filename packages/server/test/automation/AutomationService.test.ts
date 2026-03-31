import type { UrlProjectId } from "@yep-anywhere/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutomationService } from "../../src/automation/AutomationService.js";
import type { SessionMetadataService } from "../../src/metadata/index.js";
import type { ServerSettingsService } from "../../src/services/ServerSettingsService.js";
import type { Supervisor } from "../../src/supervisor/Supervisor.js";
import { EventBus } from "../../src/watcher/EventBus.js";

describe("AutomationService", () => {
  let eventBus: EventBus;
  let mockSupervisor: Supervisor;
  let mockServerSettingsService: ServerSettingsService;
  let mockSessionMetadataService: SessionMetadataService;
  const fetchMock = vi.fn<typeof fetch>();

  const projectPath = "/tmp/automation-project";
  const projectId = Buffer.from(projectPath).toString(
    "base64url",
  ) as UrlProjectId;

  beforeEach(() => {
    eventBus = new EventBus();

    mockSupervisor = {
      getProcessForSession: vi.fn(),
      resumeSession: vi.fn(async () => ({ id: "proc-1" })),
      queueMessageToSession: vi.fn(async () => ({
        success: true,
        process: { id: "proc-1" },
        restarted: false,
      })),
    } as unknown as Supervisor;

    mockServerSettingsService = {
      getSettings: vi.fn(() => ({
        serviceWorkerEnabled: true,
        persistRemoteSessionsToDisk: false,
        automationEnabled: true,
        automationDryRun: false,
        automationEventTypes: ["session-paused"],
        automationScript:
          "export default async function onEvent(ctx) { await ctx.actions.resume('continue', { projectId: ctx.event.project.id }); }",
      })),
      getSetting: vi.fn((key: string) =>
        key === "globalInstructions" ? "Existing instructions" : undefined,
      ),
      updateSettings: vi.fn(async (updates) => ({
        serviceWorkerEnabled: true,
        persistRemoteSessionsToDisk: false,
        globalInstructions: updates.globalInstructions,
      })),
    } as unknown as ServerSettingsService;

    mockSessionMetadataService = {
      getSessionVariables: vi.fn(() => ({ priority: "high" })),
      getSessionVariable: vi.fn((_sessionId: string, key: string) =>
        key === "priority" ? "high" : undefined,
      ),
      setSessionVariable: vi.fn(async () => {}),
      setSessionVariables: vi.fn(async () => {}),
      clearSessionVariables: vi.fn(async () => {}),
    } as unknown as SessionMetadataService;

    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not run callbacks when automationEventTypes is empty", async () => {
    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: [],
      automationScript:
        "export default async function onEvent(ctx) { await ctx.actions.resume('continue', { projectId: ctx.event.project.id }); }",
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "session-paused",
      sessionId: "session-1",
      projectId,
      reason: "error",
      timestamp: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockSupervisor.resumeSession).not.toHaveBeenCalled();
  });

  it("resumes a paused session when the configured event type matches", async () => {
    vi.mocked(mockSupervisor.getProcessForSession).mockReturnValue({
      projectPath,
      provider: "claude",
      permissionMode: "default",
      resolvedModel: "claude-sonnet-4-5",
      executor: "devbox",
      getMessageHistory: () => [
        {
          type: "user",
          message: {
            role: "user",
            content: "please continue from the next step",
          },
        },
      ],
    } as unknown as ReturnType<Supervisor["getProcessForSession"]>);

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "session-paused",
      sessionId: "session-1",
      projectId,
      reason: "error",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(mockSupervisor.resumeSession).toHaveBeenCalledWith(
        "session-1",
        projectPath,
        { text: "continue" },
      );
    });
  });

  it("emits repeated session-paused events for the same session and reason", async () => {
    const automationService = new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    automationService.noteSessionPaused({
      sessionId: "session-1",
      projectId,
      processId: "proc-1",
      provider: "claude",
      reason: "error",
    });
    automationService.noteSessionPaused({
      sessionId: "session-1",
      projectId,
      processId: "proc-1",
      provider: "claude",
      reason: "error",
    });

    await vi.waitFor(() => {
      expect(mockSupervisor.resumeSession).toHaveBeenCalledTimes(2);
    });
  });

  it("can approve waiting input requests through automation actions", async () => {
    const respondToInput = vi.fn(() => true);
    vi.mocked(mockSupervisor.getProcessForSession).mockReturnValue({
      id: "proc-1",
      provider: "claude",
      permissionMode: "acceptEdits",
      resolvedModel: "claude-opus-4-5",
      executor: "devbox",
      state: {
        type: "waiting-input",
        request: {
          id: "req-1",
          sessionId: "session-1",
          type: "tool-approval",
          prompt: "Allow Edit?",
          toolName: "Edit",
          toolInput: { file_path: `${projectPath}/src/index.ts` },
          timestamp: new Date().toISOString(),
        },
      },
      respondToInput,
      projectPath,
      getMessageHistory: () => [
        {
          type: "user",
          message: { role: "user", content: "approve the edit if it is safe" },
        },
      ],
    } as unknown as ReturnType<Supervisor["getProcessForSession"]>);

    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["tool-approval"],
      automationScript:
        "export default async function onEvent(ctx) { await ctx.actions.approve(); }",
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "process-state-changed",
      sessionId: "session-1",
      projectId,
      activity: "waiting-input",
      pendingInputType: "tool-approval",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(respondToInput).toHaveBeenCalledWith(
        "req-1",
        "approve",
        undefined,
      );
    });
  });

  it("provides a request helper that sends JSON and parses JSON responses", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true, event: "received" }), {
        headers: { "content-type": "application/json" },
      }),
    );

    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["session-paused"],
      automationScript: `
        export default async function onEvent(ctx) {
          const result = await ctx.http.request("https://example.test/webhook", {
            method: "POST",
            json: { eventType: ctx.event.type, sessionId: ctx.event.session.id },
          });
          await ctx.log("request result", result);
        }
      `,
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "session-paused",
      sessionId: "session-1",
      projectId,
      reason: "error",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.test/webhook");
    expect(init.method).toBe("POST");
    expect(init.body).toBe(
      JSON.stringify({ eventType: "session-paused", sessionId: "session-1" }),
    );
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
  });

  it("returns the raw response when request is called with raw: true", async () => {
    fetchMock.mockResolvedValue(
      new Response("accepted", {
        status: 202,
        headers: { "content-type": "text/plain" },
      }),
    );

    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["session-paused"],
      automationScript: `
        export default async function onEvent(ctx) {
          const response = await ctx.http.request("https://example.test/raw", {
            method: "GET",
            raw: true,
          });
          await ctx.log("raw status", response.status);
        }
      `,
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "session-paused",
      sessionId: "session-1",
      projectId,
      reason: "error",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://example.test/raw",
        expect.objectContaining({ method: "GET" }),
      );
    });
  });

  it("exposes projectName and projectPath on session-paused events", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      }),
    );

    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["session-paused"],
      automationScript: `
        export default async function onEvent(ctx) {
          await ctx.http.request("https://example.test/project", {
            method: "POST",
            json: {
              projectName: ctx.event.project.name,
              projectPath: ctx.event.project.path,
            },
          });
        }
      `,
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "session-paused",
      sessionId: "session-1",
      projectId,
      reason: "error",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(
      JSON.stringify({
        projectName: "automation-project",
        projectPath,
      }),
    );
  });

  it("exposes projectName and projectPath on waiting-input events", async () => {
    const respondToInput = vi.fn(() => true);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      }),
    );

    vi.mocked(mockSupervisor.getProcessForSession).mockReturnValue({
      id: "proc-1",
      provider: "claude",
      permissionMode: "acceptEdits",
      resolvedModel: "claude-opus-4-5",
      executor: "devbox",
      state: {
        type: "waiting-input",
        request: {
          id: "req-1",
          sessionId: "session-1",
          type: "tool-approval",
          prompt: "Allow Edit?",
          toolName: "Edit",
          toolInput: { file_path: `${projectPath}/src/index.ts` },
          timestamp: new Date().toISOString(),
        },
      },
      respondToInput,
      projectPath,
      getMessageHistory: () => [
        {
          type: "user",
          message: { role: "user", content: "approve the edit if it is safe" },
        },
      ],
    } as unknown as ReturnType<Supervisor["getProcessForSession"]>);

    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["tool-approval"],
      automationScript: `
        export default async function onEvent(ctx) {
          await ctx.http.request("https://example.test/project", {
            method: "POST",
            json: {
              projectName: ctx.event.project.name,
              projectPath: ctx.event.project.path,
            },
          });
        }
      `,
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "process-state-changed",
      sessionId: "session-1",
      projectId,
      activity: "waiting-input",
      pendingInputType: "tool-approval",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(
      JSON.stringify({
        projectName: "automation-project",
        projectPath,
      }),
    );
  });

  it("exposes model, executor, permissionMode, toolName, and lastUserMessageText", async () => {
    const respondToInput = vi.fn(() => true);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      }),
    );

    vi.mocked(mockSupervisor.getProcessForSession).mockReturnValue({
      id: "proc-1",
      provider: "claude",
      permissionMode: "acceptEdits",
      resolvedModel: "claude-opus-4-5",
      executor: "devbox",
      state: {
        type: "waiting-input",
        request: {
          id: "req-1",
          sessionId: "session-1",
          type: "tool-approval",
          prompt: "Allow Edit?",
          toolName: "Edit",
          toolInput: { file_path: `${projectPath}/src/index.ts` },
          timestamp: new Date().toISOString(),
        },
      },
      respondToInput,
      projectPath,
      getMessageHistory: () => [
        {
          type: "assistant",
          message: { role: "assistant", content: "I can make that edit." },
        },
        {
          type: "user",
          message: { role: "user", content: "approve the edit if it is safe" },
        },
      ],
    } as unknown as ReturnType<Supervisor["getProcessForSession"]>);

    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["tool-approval"],
      automationScript: `
        export default async function onEvent(ctx) {
          await ctx.http.request("https://example.test/context", {
            method: "POST",
            json: {
              permissionMode: ctx.event.process.permissionMode,
              model: ctx.event.process.model,
              executor: ctx.event.process.executor,
              toolName: ctx.event.type === "session-paused" ? undefined : ctx.event.tool.toolName,
              lastUserMessageText: ctx.event.session.lastUserMessageText,
            },
          });
        }
      `,
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "process-state-changed",
      sessionId: "session-1",
      projectId,
      activity: "waiting-input",
      pendingInputType: "tool-approval",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(
      JSON.stringify({
        permissionMode: "acceptEdits",
        model: "claude-opus-4-5",
        executor: "devbox",
        toolName: "Edit",
        lastUserMessageText: "approve the edit if it is safe",
      }),
    );
  });

  it("queues slash commands through sendCommand", async () => {
    vi.mocked(mockSupervisor.getProcessForSession).mockReturnValue({
      id: "proc-1",
      provider: "claude",
      permissionMode: "default",
      resolvedModel: "claude-sonnet-4-5",
      executor: "devbox",
      projectPath,
      getMessageHistory: () => [],
    } as unknown as ReturnType<Supervisor["getProcessForSession"]>);

    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["session-paused"],
      automationScript:
        "export default async function onEvent(ctx) { await ctx.actions.sendCommand('model', 'sonnet'); }",
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "session-paused",
      sessionId: "session-1",
      projectId,
      reason: "error",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(mockSupervisor.queueMessageToSession).toHaveBeenCalledWith(
        "session-1",
        projectPath,
        { text: "/model sonnet" },
      );
    });
  });

  it("supports reading and updating global instructions through ctx.context", async () => {
    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["session-paused"],
      automationScript: `
        export default async function onEvent(ctx) {
          const current = ctx.context.getGlobalInstructions();
          await ctx.context.appendGlobalInstructions("Added by automation");
          await ctx.log("global instructions", current);
        }
      `,
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "session-paused",
      sessionId: "session-1",
      projectId,
      reason: "error",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(mockServerSettingsService.updateSettings).toHaveBeenCalledWith({
        globalInstructions: "Existing instructions\n\nAdded by automation",
      });
    });
  });

  it("exposes queued message details on message-queued events", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
      }),
    );

    vi.mocked(mockSupervisor.getProcessForSession).mockReturnValue({
      id: "proc-1",
      provider: "claude",
      permissionMode: "default",
      resolvedModel: "claude-sonnet-4-5",
      executor: "devbox",
      projectPath,
      getMessageHistory: () => [
        {
          type: "user",
          message: { role: "user", content: "/model sonnet" },
        },
      ],
    } as unknown as ReturnType<Supervisor["getProcessForSession"]>);

    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["message-queued"],
      automationScript: `
        export default async function onEvent(ctx) {
          await ctx.http.request("https://example.test/message", {
            method: "POST",
            json: {
              queuedMessageText: ctx.event.session.queuedMessageText,
              queuedCommandName: ctx.event.session.queuedCommandName,
              queuedCommandArgs: ctx.event.session.queuedCommandArgs,
              lastUserMessageText: ctx.event.session.lastUserMessageText,
            },
          });
        }
      `,
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
    });

    eventBus.emit({
      type: "message-queued",
      sessionId: "session-1",
      projectId,
      processId: "proc-1",
      provider: "claude",
      text: "/model sonnet",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBe(
      JSON.stringify({
        queuedMessageText: "/model sonnet",
        queuedCommandName: "model",
        queuedCommandArgs: ["sonnet"],
        lastUserMessageText: "/model sonnet",
      }),
    );
  });

  it("supports session-scoped variables through ctx.context", async () => {
    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["session-paused"],
      automationScript: `
        export default async function onEvent(ctx) {
          const current = ctx.context.getSessionVariable("priority");
          const all = ctx.context.getSessionVariables();
          await ctx.context.setSessionVariable("lastAction", "resume");
          await ctx.context.setSessionVariables({
            ...all,
            retries: 2,
            priority: current,
          });
        }
      `,
    });

    new AutomationService({
      eventBus,
      supervisor: mockSupervisor,
      serverSettingsService: mockServerSettingsService,
      sessionMetadataService: mockSessionMetadataService,
    });

    eventBus.emit({
      type: "session-paused",
      sessionId: "session-1",
      projectId,
      reason: "error",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(
        mockSessionMetadataService.setSessionVariable,
      ).toHaveBeenCalledWith("session-1", "lastAction", "resume");
      expect(
        mockSessionMetadataService.setSessionVariables,
      ).toHaveBeenCalledWith("session-1", {
        priority: "high",
        retries: 2,
      });
    });
  });
});
