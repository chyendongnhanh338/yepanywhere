import { describe, expect, it, vi } from "vitest";
import type { NotificationChannelService } from "../../src/notifications-channels/NotificationChannelService.js";
import type { NotificationDispatcher } from "../../src/notifications-channels/NotificationDispatcher.js";
import { createNotificationChannelRoutes } from "../../src/notifications-channels/routes.js";

describe("Notification channel routes", () => {
  function createMockService(): NotificationChannelService {
    return {
      getChannels: vi.fn(() => []),
      getResponse: vi.fn(() => ({
        eventSettings: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        channels: [],
        supportedChannelTypes: [
          "customemail",
          "dingtalk",
          "wechatrobot",
          "wechatapp",
          "wxpusher",
          "igot",
          "qmsg",
          "xizhi",
          "onebot",
          "feishu",
          "telegram",
          "serverchan",
          "discord",
          "pushplus",
          "pushdeer",
          "ntfy",
        ],
      })),
      replaceChannels: vi.fn(() => Promise.resolve()),
    } as unknown as NotificationChannelService;
  }

  function createMockDispatcher(): NotificationDispatcher {
    return {
      testChannel: vi.fn(() =>
        Promise.resolve({
          status: 200,
          statusText: "OK",
        }),
      ),
    } as unknown as NotificationDispatcher;
  }

  it("GET / returns editable channels", async () => {
    const service = createMockService();
    const dispatcher = createMockDispatcher();
    const channels = [
      {
        id: "c1",
        type: "telegram",
        enabled: true,
        name: "Telegram",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: { botToken: "token", chatId: "123" },
      },
    ];
    vi.mocked(service.getChannels).mockReturnValue(channels);
    vi.mocked(service.getResponse).mockReturnValue({
      eventSettings: {
        toolApproval: true,
        userQuestion: true,
        sessionHalted: true,
      },
      channels,
      supportedChannelTypes: [
        "customemail",
        "dingtalk",
        "wechatrobot",
        "wechatapp",
        "wxpusher",
        "igot",
        "qmsg",
        "xizhi",
        "onebot",
        "feishu",
        "telegram",
        "serverchan",
        "discord",
        "pushplus",
        "pushdeer",
        "ntfy",
      ],
    });

    const app = createNotificationChannelRoutes({
      channelService: service,
      dispatcher,
    });
    const res = await app.request("/");
    expect(res.status).toBe(200);

    const json = (await res.json()) as {
      channels: Array<{
        id: string;
        type: string;
        config: { botToken: string };
      }>;
      supportedChannelTypes: string[];
    };
    expect(json.channels[0]).toMatchObject({
      id: "c1",
      type: "telegram",
      config: { botToken: "token" },
    });
    expect(json.supportedChannelTypes).toEqual([
      "customemail",
      "dingtalk",
      "wechatrobot",
      "wechatapp",
      "wxpusher",
      "igot",
      "qmsg",
      "xizhi",
      "onebot",
      "feishu",
      "telegram",
      "serverchan",
      "discord",
      "pushplus",
      "pushdeer",
      "ntfy",
    ]);
  });

  it("PUT / validates and persists channels", async () => {
    const service = createMockService();
    const dispatcher = createMockDispatcher();
    const app = createNotificationChannelRoutes({
      channelService: service,
      dispatcher,
    });
    vi.mocked(service.getResponse).mockReturnValue({
      eventSettings: {
        toolApproval: true,
        userQuestion: true,
        sessionHalted: true,
      },
      channels: [],
      supportedChannelTypes: [
        "customemail",
        "dingtalk",
        "wechatrobot",
        "wechatapp",
        "wxpusher",
        "igot",
        "qmsg",
        "xizhi",
        "onebot",
        "feishu",
        "telegram",
        "serverchan",
        "discord",
        "pushplus",
        "pushdeer",
        "ntfy",
      ],
    });

    const res = await app.request("/", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channels: [
          {
            id: "c2",
            type: "serverchan",
            enabled: true,
            name: "ServerChan",
            eventTypes: {
              toolApproval: true,
              userQuestion: false,
              sessionHalted: true,
            },
            config: { sendKey: "sct_xxx" },
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(service.replaceChannels).toHaveBeenCalledTimes(1);
  });

  it("POST /:channelId/test sends targeted test", async () => {
    const service = createMockService();
    const dispatcher = createMockDispatcher();
    vi.mocked(service.getChannels).mockReturnValue([
      {
        id: "chan-1",
        type: "telegram",
        enabled: true,
        name: "Telegram",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: true,
        },
        config: { botToken: "token", chatId: "100" },
      },
    ]);

    const app = createNotificationChannelRoutes({
      channelService: service,
      dispatcher,
    });
    const res = await app.request("/chan-1/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });

    expect(res.status).toBe(200);
    expect(dispatcher.testChannel).toHaveBeenCalledTimes(1);
  });

  it("PUT / accepts newly supported channels", async () => {
    const service = createMockService();
    const dispatcher = createMockDispatcher();
    const app = createNotificationChannelRoutes({
      channelService: service,
      dispatcher,
    });

    const res = await app.request("/", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channels: [
          {
            id: "c3",
            type: "discord",
            enabled: true,
            name: "Discord",
            eventTypes: {
              toolApproval: true,
              userQuestion: true,
              sessionHalted: true,
            },
            config: {
              webhook: "https://discord.com/api/webhooks/test/test",
              username: "Yep Anywhere",
            },
          },
          {
            id: "c4",
            type: "pushplus",
            enabled: true,
            name: "PushPlus",
            eventTypes: {
              toolApproval: true,
              userQuestion: true,
              sessionHalted: true,
            },
            config: {
              token: "token",
              template: "html",
              channel: "wechat",
            },
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(service.replaceChannels).toHaveBeenCalledTimes(1);
  });

  it("PUT / accepts added providers from the long tail", async () => {
    const service = createMockService();
    const dispatcher = createMockDispatcher();
    const app = createNotificationChannelRoutes({
      channelService: service,
      dispatcher,
    });

    const res = await app.request("/", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        channels: [
          {
            id: "c5",
            type: "customemail",
            enabled: true,
            name: "CustomEmail",
            eventTypes: {
              toolApproval: true,
              userQuestion: true,
              sessionHalted: true,
            },
            config: {
              emailType: "text",
              toAddress: "to@example.com",
              authUser: "user@example.com",
              authPass: "secret",
              host: "smtp.example.com",
              port: 465,
            },
          },
          {
            id: "c6",
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
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(service.replaceChannels).toHaveBeenCalledTimes(1);
  });

  it("POST /:channelId/test returns 404 for unknown channel", async () => {
    const service = createMockService();
    const dispatcher = createMockDispatcher();
    vi.mocked(service.getChannels).mockReturnValue([]);

    const app = createNotificationChannelRoutes({
      channelService: service,
      dispatcher,
    });
    const res = await app.request("/missing/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });

    expect(res.status).toBe(404);
    expect(dispatcher.testChannel).not.toHaveBeenCalled();
  });
});
