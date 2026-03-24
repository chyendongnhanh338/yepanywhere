import type { PushService } from "../push/PushService.js";
import type { PushPayload, SendResult } from "../push/types.js";
import type { ConnectedBrowsersService } from "../services/ConnectedBrowsersService.js";
import { getNotificationProvider } from "./providers/index.js";
import { formatPayload } from "./providers/types.js";
import type { NotificationChannel, NotificationEventType } from "./types.js";

export interface NotificationDispatcherOptions {
  pushService: PushService;
  channelService: {
    getChannels(): NotificationChannel[];
  };
  connectedBrowsers?: ConnectedBrowsersService;
}

export class NotificationDispatcher {
  private readonly pushService: PushService;
  private readonly channelService: NotificationDispatcherOptions["channelService"];
  private readonly connectedBrowsers?: ConnectedBrowsersService;

  constructor(options: NotificationDispatcherOptions) {
    this.pushService = options.pushService;
    this.channelService = options.channelService;
    this.connectedBrowsers = options.connectedBrowsers;
  }

  async dispatch(
    payload: PushPayload,
    eventType: NotificationEventType,
  ): Promise<{
    webPush: SendResult[];
    external: Array<{
      channelId: string;
      success: boolean;
      status?: number;
      statusText?: string;
      error?: string;
    }>;
  }> {
    const connectedIds =
      this.connectedBrowsers?.getConnectedBrowserProfileIds() ?? [];
    const webPush =
      this.pushService.getSubscriptionCount() > 0
        ? await this.pushService.sendToAll(payload, {
            excludeBrowserProfileIds: connectedIds,
          })
        : [];
    const external = await Promise.all(
      this.channelService
        .getChannels()
        .filter((channel) => channel.enabled && channel.eventTypes[eventType])
        .map(async (channel) => {
          try {
            const response = await sendExternalNotification(channel, payload);
            return {
              channelId: channel.id,
              success: response.status >= 200 && response.status < 300,
              status: response.status,
              statusText: response.statusText,
            };
          } catch (error) {
            return {
              channelId: channel.id,
              success: false,
              error: error instanceof Error ? error.message : "Unknown error",
            };
          }
        }),
    );
    return { webPush, external };
  }

  async testChannel(channel: NotificationChannel, message?: string) {
    return await sendExternalNotification(channel, {
      type: "test",
      message: message ?? "Test notification from Yep Anywhere",
      timestamp: new Date().toISOString(),
    });
  }
}

async function sendExternalNotification(
  channel: NotificationChannel,
  payload: PushPayload,
): Promise<{ status: number; statusText: string }> {
  const message = formatPayload(payload);
  return await getNotificationProvider(channel).send(channel, message);
}
