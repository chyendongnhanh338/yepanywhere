import { describe, expect, it } from "vitest";
import {
  buildChannelsResponse,
  notificationChannelSchema,
} from "../../src/notifications-channels/schema.js";

describe("notification channel schema", () => {
  it("supports the full provider list in response metadata", () => {
    const response = buildChannelsResponse([]);

    expect(response.supportedChannelTypes).toEqual([
      "customemail",
      "gotify",
      "webhook",
      "slack",
      "teams",
      "mattermost",
      "bark",
      "line",
      "pushover",
      "pushbullet",
      "matrix",
      "googlechat",
      "rocketchat",
      "keep",
      "kook",
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

  it("validates a feishu channel payload", () => {
    const parsed = notificationChannelSchema.parse({
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
        appSecret: "app-secret",
        receiveIdType: "open_id",
        receiveId: "ou_xxx",
      },
    });

    expect(parsed.type).toBe("feishu");
  });

  it("validates a webhook channel payload", () => {
    const parsed = notificationChannelSchema.parse({
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
        method: "post",
      },
    });

    expect(parsed.type).toBe("webhook");
  });

  it("validates a matrix channel payload", () => {
    const parsed = notificationChannelSchema.parse({
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
        accessToken: "secret",
        roomId: "!abc123:example.com",
      },
    });

    expect(parsed.type).toBe("matrix");
  });

  it("validates a rocket chat channel payload", () => {
    const parsed = notificationChannelSchema.parse({
      id: "rocket-1",
      type: "rocketchat",
      enabled: true,
      name: "Rocket.Chat",
      eventTypes: {
        toolApproval: true,
        userQuestion: true,
        sessionHalted: true,
      },
      config: {
        webhook: "https://rocket.example.com/hooks/abc",
        channel: "#alerts",
      },
    });

    expect(parsed.type).toBe("rocketchat");
  });

  it("rejects invalid onebot payloads without a proper URL", () => {
    expect(() =>
      notificationChannelSchema.parse({
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
          baseUrl: "not-a-url",
          messageType: "private",
          userId: 1,
        },
      }),
    ).toThrow();
  });
});
