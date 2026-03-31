import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSettingsRoutes } from "../../src/routes/settings.js";
import type {
  ServerSettings,
  ServerSettingsService,
} from "../../src/services/ServerSettingsService.js";

describe("Settings Routes", () => {
  let settings: ServerSettings;
  let mockServerSettingsService: ServerSettingsService;

  beforeEach(() => {
    settings = {
      serviceWorkerEnabled: true,
      persistRemoteSessionsToDisk: false,
      automationEnabled: false,
      automationDryRun: true,
      automationEventTypes: [
        "tool-approval",
        "user-question",
        "session-paused",
      ],
    };

    mockServerSettingsService = {
      getSettings: vi.fn(() => settings),
      updateSettings: vi.fn(async (updates: Partial<ServerSettings>) => {
        settings = { ...settings, ...updates };
        return settings;
      }),
    } as unknown as ServerSettingsService;
  });

  describe("PUT /remote-executors", () => {
    it("rejects invalid host aliases", async () => {
      const routes = createSettingsRoutes({
        serverSettingsService: mockServerSettingsService,
      });

      const response = await routes.request("/remote-executors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executors: ["devbox", "-oProxyCommand=touch_/tmp/pwned"],
        }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid remote executor host alias");
      expect(mockServerSettingsService.updateSettings).not.toHaveBeenCalled();
    });

    it("accepts and normalizes valid aliases", async () => {
      const routes = createSettingsRoutes({
        serverSettingsService: mockServerSettingsService,
      });

      const response = await routes.request("/remote-executors", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          executors: ["  devbox  ", "gpu-server", "", "  "],
        }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.executors).toEqual(["devbox", "gpu-server"]);
      expect(mockServerSettingsService.updateSettings).toHaveBeenCalledWith({
        remoteExecutors: ["devbox", "gpu-server"],
      });
    });
  });

  describe("PUT /", () => {
    it("rejects invalid aliases in remoteExecutors setting", async () => {
      const routes = createSettingsRoutes({
        serverSettingsService: mockServerSettingsService,
      });

      const response = await routes.request("/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remoteExecutors: ["devbox", "-oProxyCommand=touch_/tmp/pwned"],
        }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid remote executor host alias");
      expect(mockServerSettingsService.updateSettings).not.toHaveBeenCalled();
    });

    it("accepts and normalizes valid aliases in chromeOsHosts setting", async () => {
      const routes = createSettingsRoutes({
        serverSettingsService: mockServerSettingsService,
      });

      const response = await routes.request("/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chromeOsHosts: ["  chromeroot  ", "lab-book", "", " "],
        }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.settings.chromeOsHosts).toEqual(["chromeroot", "lab-book"]);
      expect(mockServerSettingsService.updateSettings).toHaveBeenCalledWith({
        chromeOsHosts: ["chromeroot", "lab-book"],
      });
    });

    it("rejects invalid aliases in chromeOsHosts setting", async () => {
      const routes = createSettingsRoutes({
        serverSettingsService: mockServerSettingsService,
      });

      const response = await routes.request("/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chromeOsHosts: ["chromeroot", "-oProxyCommand=touch_/tmp/pwned"],
        }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("Invalid ChromeOS host alias");
      expect(mockServerSettingsService.updateSettings).not.toHaveBeenCalled();
    });

    it("accepts automation settings updates", async () => {
      const routes = createSettingsRoutes({
        serverSettingsService: mockServerSettingsService,
      });

      const response = await routes.request("/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automationEnabled: true,
          automationDryRun: false,
          automationEventTypes: ["tool-approval", "session-paused", "bogus"],
          automationScript:
            "async function onEvent(ctx) { ctx.log(ctx.event.type); }",
        }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.settings.automationEnabled).toBe(true);
      expect(json.settings.automationDryRun).toBe(false);
      expect(json.settings.automationEventTypes).toEqual([
        "tool-approval",
        "session-paused",
      ]);
      expect(json.settings.automationScript).toContain("onEvent");
      expect(mockServerSettingsService.updateSettings).toHaveBeenCalledWith({
        automationEnabled: true,
        automationDryRun: false,
        automationEventTypes: ["tool-approval", "session-paused"],
        automationScript:
          "async function onEvent(ctx) { ctx.log(ctx.event.type); }",
      });
    });
  });

  describe("POST /remote-executors/:host/test", () => {
    it("rejects invalid host path parameters", async () => {
      const routes = createSettingsRoutes({
        serverSettingsService: mockServerSettingsService,
      });
      const invalidHost = encodeURIComponent("-oProxyCommand=touch_/tmp/pwned");

      const response = await routes.request(
        `/remote-executors/${invalidHost}/test`,
        {
          method: "POST",
        },
      );

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("host must be a valid SSH host alias");
    });
  });
});
