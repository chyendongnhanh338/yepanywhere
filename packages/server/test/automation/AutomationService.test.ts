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
    } as unknown as Supervisor;

    mockServerSettingsService = {
      getSettings: vi.fn(() => ({
        serviceWorkerEnabled: true,
        persistRemoteSessionsToDisk: false,
        automationEnabled: true,
        automationDryRun: false,
        automationEventTypes: ["session-paused"],
        automationWebhookUrl: "https://example.test/webhook",
        automationWebhookToken: "secret-token",
      })),
      getSetting: vi.fn((key: string) =>
        key === "globalInstructions" ? "Existing instructions" : undefined,
      ),
    } as unknown as ServerSettingsService;

    mockSessionMetadataService = {
      getSessionVariables: vi.fn(() => ({ priority: "high" })),
    } as unknown as SessionMetadataService;

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not call webhook when automationEventTypes is empty", async () => {
    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: [],
      automationWebhookUrl: "https://example.test/webhook",
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

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

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts session-paused events to the configured webhook with token and context", async () => {
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
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

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
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://example.test/webhook");
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("authorization")).toBe(
      "Bearer secret-token",
    );
    expect(new Headers(init.headers).get("content-type")).toBe(
      "application/json",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      event: {
        type: "session-paused",
        timestamp: expect.any(String),
        reason: "error",
        project: {
          id: projectId,
          name: "automation-project",
          path: projectPath,
        },
        session: {
          id: "session-1",
          lastUserMessageText: "please continue from the next step",
        },
        process: {
          id: undefined,
          provider: undefined,
          permissionMode: "default",
          model: "claude-sonnet-4-5",
          executor: "devbox",
        },
      },
      dryRun: false,
      context: {
        globalInstructions: "Existing instructions",
        sessionVariables: {
          priority: "high",
        },
      },
    });
  });

  it("includes queued command details for message-queued events", async () => {
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
      automationWebhookUrl: "https://example.test/webhook",
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

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
      source: "user",
      timestamp: new Date().toISOString(),
    });

    await vi.waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.event.session).toEqual({
      id: "session-1",
      lastUserMessageText: "/model sonnet",
      queuedMessageText: "/model sonnet",
      queuedCommandName: "model",
      queuedCommandArgs: ["sonnet"],
    });
  });

  it("ignores automation-originated message-queued events to avoid feedback loops", async () => {
    vi.mocked(mockServerSettingsService.getSettings).mockReturnValue({
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: true,
      automationDryRun: false,
      automationEventTypes: ["message-queued"],
      automationWebhookUrl: "https://example.test/webhook",
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

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
      source: "automation",
      timestamp: new Date().toISOString(),
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
