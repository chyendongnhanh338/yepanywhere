import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NotificationChannelService } from "../../src/notifications-channels/NotificationChannelService.js";

describe("NotificationChannelService", () => {
  let tempDir: string;
  let service: NotificationChannelService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "notif-channels-test-"));
    service = new NotificationChannelService({ dataDir: tempDir });
    await service.initialize();
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("persists channels to notification-channels.json", async () => {
    await service.replaceChannels([
      {
        id: "chan-1",
        type: "telegram",
        enabled: true,
        name: "Telegram",
        eventTypes: {
          toolApproval: true,
          userQuestion: true,
          sessionHalted: false,
        },
        config: {
          botToken: "token",
          chatId: "123",
        },
      },
    ]);

    const file = path.join(tempDir, "notification-channels.json");
    const content = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(content) as {
      channels: Array<{ type: string; config: { botToken: string } }>;
    };

    expect(parsed.channels).toHaveLength(1);
    expect(parsed.channels[0].type).toBe("telegram");
    expect(parsed.channels[0].config.botToken).toBe("token");
  });

  it("loads saved channels on reinitialize", async () => {
    await service.replaceChannels([
      {
        id: "chan-2",
        type: "serverchan",
        enabled: true,
        name: "ServerChan",
        eventTypes: {
          toolApproval: true,
          userQuestion: false,
          sessionHalted: true,
        },
        config: {
          sendKey: "send-key",
        },
      },
    ]);

    const another = new NotificationChannelService({ dataDir: tempDir });
    await another.initialize();
    const channels = another.getChannels();

    expect(channels).toHaveLength(1);
    expect(channels[0].type).toBe("serverchan");
    if (channels[0].type === "serverchan") {
      expect(channels[0].config.sendKey).toBe("send-key");
    }
  });

  it("persists newly supported channel types", async () => {
    await service.replaceChannels([
      {
        id: "chan-3",
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
        id: "chan-4",
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
          topic: "yep-anywhere",
          priority: 3,
          tags: ["claude", "approval"],
        },
      },
    ]);

    const channels = service.getChannels();
    expect(channels).toHaveLength(2);
    expect(channels[0]?.type).toBe("discord");
    expect(channels[1]?.type).toBe("ntfy");
  });

  it("accepts legacy remaining provider shapes", async () => {
    await service.replaceChannels([
      {
        id: "chan-5",
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
        id: "chan-6",
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
          receiveId: "user-id",
        },
      },
    ]);

    const channels = service.getChannels();
    expect(channels).toHaveLength(2);
    expect(channels[0]?.type).toBe("customemail");
    expect(channels[1]?.type).toBe("feishu");
  });
});
