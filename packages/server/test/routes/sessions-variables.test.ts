import { describe, expect, it, vi } from "vitest";
import {
  type SessionsDeps,
  createSessionsRoutes,
} from "../../src/routes/sessions.js";

describe("Sessions variables routes", () => {
  function createRoutes() {
    const sessionMetadataService = {
      getSessionVariables: vi.fn(() => ({ retries: 1 })),
      setSessionVariables: vi.fn(async () => {}),
      setSessionVariable: vi.fn(async () => {}),
      clearSessionVariables: vi.fn(async () => {}),
    };

    const routes = createSessionsRoutes({
      supervisor: {
        getProcessForSession: vi.fn(() => null),
      } as unknown as SessionsDeps["supervisor"],
      scanner: {
        getProject: vi.fn(),
        getOrCreateProject: vi.fn(),
      } as unknown as SessionsDeps["scanner"],
      readerFactory: vi.fn(),
      sessionMetadataService,
    });

    return { routes, sessionMetadataService };
  }

  it("gets all session variables", async () => {
    const { routes } = createRoutes();

    const response = await routes.request("/sessions/sess-1/variables");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      variables: { retries: 1 },
    });
  });

  it("replaces all session variables", async () => {
    const { routes, sessionMetadataService } = createRoutes();

    const response = await routes.request("/sessions/sess-1/variables", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variables: { retries: 2, mode: "nightly" },
      }),
    });

    expect(response.status).toBe(200);
    expect(sessionMetadataService.setSessionVariables).toHaveBeenCalledWith(
      "sess-1",
      { retries: 2, mode: "nightly" },
    );
  });

  it("sets and clears a single session variable", async () => {
    const { routes, sessionMetadataService } = createRoutes();

    const setResponse = await routes.request(
      "/sessions/sess-1/variables/retries",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: 3 }),
      },
    );
    expect(setResponse.status).toBe(200);

    const clearResponse = await routes.request(
      "/sessions/sess-1/variables/retries",
      {
        method: "DELETE",
      },
    );
    expect(clearResponse.status).toBe(200);

    expect(sessionMetadataService.setSessionVariable).toHaveBeenNthCalledWith(
      1,
      "sess-1",
      "retries",
      3,
    );
    expect(sessionMetadataService.setSessionVariable).toHaveBeenNthCalledWith(
      2,
      "sess-1",
      "retries",
      undefined,
    );
  });
});
