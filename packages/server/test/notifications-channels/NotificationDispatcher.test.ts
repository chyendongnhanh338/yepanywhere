import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationDispatcher } from "../../src/notifications-channels/NotificationDispatcher.js";
import type { NotificationChannel } from "../../src/notifications-channels/types.js";
import type { PushService } from "../../src/push/PushService.js";
import type { PendingInputPayload } from "../../src/push/types.js";

describe("NotificationDispatcher", () => {
  let pushService: PushService;

  const payload: PendingInputPayload = {
    type: "pending-input",
    sessionId: "session-1",
    projectId: "project-1",
    projectName: "demo",
    inputType: "tool-approval",
    summary: "Edit: index.ts",
    timestamp: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ access_token: "wechat-token" }),
        text: async () => "",
      })),
    );

    pushService = {
      getSubscriptionCount: vi.fn(() => 0),
      sendToAll: vi.fn(async () => []),
    } as unknown as PushService;
  });

  function createDispatcher(channels: NotificationChannel[]) {
    return new NotificationDispatcher({
      pushService,
      channelService: {
        getChannels: () => channels,
      },
    });
  }

  it("dispatches Telegram with bot API payload", async () => {
    const dispatcher = createDispatcher([
      {
        id: "telegram-1",
        type: "telegram",
        enabled: true,
        name: "Telegram",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          botToken: "bot-token",
          chatId: "123456",
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenCalledWith(
      "https://api.telegram.org/botbot-token/sendMessage",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("dispatches Gotify with message endpoint payload", async () => {
    const dispatcher = createDispatcher([
      {
        id: "gotify-1",
        type: "gotify",
        enabled: true,
        name: "Gotify",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          serverUrl: "https://gotify.example.com/",
          applicationToken: "app-token",
          priority: 9,
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenCalledWith(
      "https://gotify.example.com/message?token=app-token",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"priority":9'),
      }),
    );
  });

  it("dispatches Webhook with GET params when configured", async () => {
    const dispatcher = createDispatcher([
      {
        id: "webhook-1",
        type: "webhook",
        enabled: true,
        name: "Webhook",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          url: "https://example.com/hook",
          method: "get",
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenCalledWith(
      "https://example.com/hook?title=%5BYep+Anywhere%5D+demo+needs+attention&msg=tool-approval%3A+Edit%3A+index.ts",
      expect.objectContaining({
        method: "GET",
      }),
    );
  });

  it("dispatches Matrix with room message PUT request", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);

    const dispatcher = createDispatcher([
      {
        id: "matrix-1",
        type: "matrix",
        enabled: true,
        name: "Matrix",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          homeserverUrl: "https://matrix.example.com",
          accessToken: "matrix-token",
          roomId: "!room:example.com",
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenCalledWith(
      "https://matrix.example.com/_matrix/client/r0/rooms/!room%3Aexample.com/send/m.room.message/1700000000000",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer matrix-token",
        }),
      }),
    );
  });

  it("dispatches Kook with bot authorization", async () => {
    const dispatcher = createDispatcher([
      {
        id: "kook-1",
        type: "kook",
        enabled: true,
        name: "Kook",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          botToken: "kook-token",
          channelId: "123456",
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenCalledWith(
      "https://www.kookapp.cn/api/v3/message/create",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bot kook-token",
        }),
      }),
    );
  });

  it("dispatches ntfy with bearer token authentication", async () => {
    const dispatcher = createDispatcher([
      {
        id: "ntfy-1",
        type: "ntfy",
        enabled: true,
        name: "ntfy",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          url: "https://ntfy.sh",
          topic: "demo",
          authenticationMethod: "accessToken",
          accessToken: "secret-token",
          priority: 4,
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenCalledWith(
      "https://ntfy.sh",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer secret-token",
        }),
      }),
    );
  });

  it("dispatches ntfy with basic authentication", async () => {
    const dispatcher = createDispatcher([
      {
        id: "ntfy-2",
        type: "ntfy",
        enabled: true,
        name: "ntfy-basic",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          url: "https://ntfy.example.com",
          topic: "demo",
          authenticationMethod: "usernamePassword",
          username: "alice",
          password: "secret",
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenCalledWith(
      "https://ntfy.example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${Buffer.from("alice:secret").toString("base64")}`,
        }),
      }),
    );
  });

  it("dispatches OneBot with private target", async () => {
    const dispatcher = createDispatcher([
      {
        id: "onebot-1",
        type: "onebot",
        enabled: true,
        name: "OneBot",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          baseUrl: "http://127.0.0.1:5700",
          messageType: "private",
          userId: 123456,
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:5700/send_msg",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"user_id":123456'),
      }),
    );
  });

  it("dispatches Feishu with tenant token then send message", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => "",
          json: async () => ({ tenant_access_token: "tenant-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ tenant_access_token: "tenant-token" }),
          text: async () => "",
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: "OK",
          text: async () => "",
          json: async () => ({}),
        }),
    );

    const dispatcher = createDispatcher([
      {
        id: "feishu-1",
        type: "feishu",
        enabled: true,
        name: "Feishu",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          appId: "app-id",
          appSecret: "secret",
          receiveIdType: "open_id",
          receiveId: "ou_xxx",
        },
      },
    ]);

    await dispatcher.dispatch(payload, "toolApproval");

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer tenant-token",
        }),
      }),
    );
  });

  it("returns channel-level failure for invalid qmsg config", async () => {
    const dispatcher = createDispatcher([
      {
        id: "qmsg-1",
        type: "qmsg",
        enabled: true,
        name: "Qmsg",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: {
          key: "key",
        },
      },
    ]);

    const result = await dispatcher.dispatch(payload, "toolApproval");

    expect(result.external[0]).toMatchObject({
      channelId: "qmsg-1",
      success: false,
      error: "Qmsg qq is required",
    });
  });
});
