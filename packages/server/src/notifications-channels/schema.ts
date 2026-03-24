import { z } from "zod";
import {
  DEFAULT_NOTIFICATION_EVENT_SETTINGS,
  type NotificationChannel,
  type NotificationChannelsResponse,
} from "./types.js";

const eventTypesSchema = z.object({
  toolApproval: z.boolean().default(true),
  userQuestion: z.boolean().default(true),
  sessionHalted: z.boolean().default(true),
});

const telegramConfigSchema = z.object({
  botToken: z.string().min(1).max(200),
  chatId: z.string().regex(/^-?\d+$/, "chatId must be an integer string"),
  disableNotification: z.boolean().optional(),
});

const serverChanConfigSchema = z.object({
  sendKey: z.string().min(1).max(200),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
  short: z.string().min(1).max(200).optional(),
});

const discordConfigSchema = z.object({
  webhook: z.string().url().max(500),
  username: z.string().min(1).max(80).optional(),
});

const pushPlusConfigSchema = z.object({
  token: z.string().min(1).max(200),
  template: z.enum(["html", "json", "cloudMonitor"]).optional(),
  channel: z.enum(["wechat", "webhook", "mail", "cp"]).optional(),
});

const pushDeerConfigSchema = z.object({
  pushKey: z.string().min(1).max(200),
  endpoint: z.string().url().max(500).optional(),
  type: z.enum(["text", "markdown", "image"]).optional(),
});

const ntfyConfigSchema = z.object({
  url: z.string().url().max(500),
  topic: z.string().min(1).max(200),
  authenticationMethod: z
    .enum(["none", "accessToken", "usernamePassword"])
    .optional(),
  accessToken: z.string().min(1).max(300).optional(),
  username: z.string().min(1).max(200).optional(),
  password: z.string().min(1).max(300).optional(),
  priority: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ])
    .optional(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
});

const customEmailConfigSchema = z.object({
  emailType: z.enum(["text", "html"]),
  toAddress: z.string().email().max(200),
  authUser: z.string().email().max(200),
  authPass: z.string().min(1).max(200),
  host: z.string().min(1).max(200),
  port: z.number().int().positive().max(65535),
});

const dingtalkConfigSchema = z.object({
  accessToken: z.string().min(1).max(200),
  secret: z.string().min(1).max(200).optional(),
});

const gotifyConfigSchema = z.object({
  serverUrl: z.string().url().max(500),
  applicationToken: z.string().min(1).max(200),
  priority: z.number().int().min(0).max(10).optional(),
});

const webhookConfigSchema = z.object({
  url: z.string().url().max(500),
  method: z.enum(["post", "get"]).default("post"),
});

const slackConfigSchema = z.object({
  webhook: z.string().url().max(500),
  channel: z.string().min(1).max(100).optional(),
  username: z.string().min(1).max(100).optional(),
});

const teamsConfigSchema = z.object({
  webhook: z.string().url().max(500),
});

const mattermostConfigSchema = z.object({
  webhook: z.string().url().max(500),
  username: z.string().min(1).max(100).optional(),
  channel: z.string().min(1).max(100).optional(),
});

const barkConfigSchema = z.object({
  endpoint: z.string().url().max(500),
});

const lineConfigSchema = z.object({
  channelAccessToken: z.string().min(1).max(300),
  userId: z.string().min(1).max(200),
});

const pushoverConfigSchema = z.object({
  userKey: z.string().min(1).max(200),
  appToken: z.string().min(1).max(200),
});

const pushbulletConfigSchema = z.object({
  accessToken: z.string().min(1).max(200),
});

const matrixConfigSchema = z.object({
  homeserverUrl: z.string().url().max(500),
  accessToken: z.string().min(1).max(300),
  roomId: z.string().min(1).max(200),
});

const googleChatConfigSchema = z.object({
  webhook: z.string().url().max(500),
});

const rocketChatConfigSchema = z.object({
  webhook: z.string().url().max(500),
  channel: z.string().min(1).max(100).optional(),
  username: z.string().min(1).max(100).optional(),
});

const keepConfigSchema = z.object({
  webhookUrl: z.string().url().max(500),
  apiKey: z.string().min(1).max(300),
});

const kookConfigSchema = z.object({
  botToken: z.string().min(1).max(300),
  channelId: z.string().min(1).max(200),
});

const wechatRobotConfigSchema = z.object({
  key: z.string().min(1).max(200),
});

const wechatAppConfigSchema = z.object({
  corpId: z.string().min(1).max(200),
  secret: z.string().min(1).max(200),
  agentId: z.number().int().positive(),
  toUser: z.string().min(1).max(200).optional(),
});

const wxPusherConfigSchema = z.object({
  appToken: z.string().min(1).max(200),
  uid: z.string().min(1).max(200),
});

const iGotConfigSchema = z.object({
  key: z.string().min(1).max(200),
});

const qmsgConfigSchema = z.object({
  key: z.string().min(1).max(200),
  qq: z.string().min(1).max(200).optional(),
  bot: z.string().min(1).max(200).optional(),
});

const xiZhiConfigSchema = z.object({
  key: z.string().min(1).max(200),
});

const oneBotConfigSchema = z.object({
  baseUrl: z.string().url().max(500),
  accessToken: z.string().min(1).max(200).optional(),
  messageType: z.enum(["private", "group"]),
  userId: z.number().int().positive().optional(),
  groupId: z.number().int().positive().optional(),
});

const feishuConfigSchema = z.object({
  appId: z.string().min(1).max(200),
  appSecret: z.string().min(1).max(200),
  receiveIdType: z.enum(["open_id", "user_id", "union_id", "email", "chat_id"]),
  receiveId: z.string().min(1).max(200),
});

const baseChannelSchema = z.object({
  id: z.string().min(1).max(100),
  enabled: z.boolean(),
  name: z.string().min(1).max(100),
  eventTypes: eventTypesSchema.default(DEFAULT_NOTIFICATION_EVENT_SETTINGS),
});

export const notificationChannelSchema = z.discriminatedUnion("type", [
  baseChannelSchema.extend({
    type: z.literal("customemail"),
    config: customEmailConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("gotify"),
    config: gotifyConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("webhook"),
    config: webhookConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("slack"),
    config: slackConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("teams"),
    config: teamsConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("mattermost"),
    config: mattermostConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("bark"),
    config: barkConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("line"),
    config: lineConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("pushover"),
    config: pushoverConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("pushbullet"),
    config: pushbulletConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("matrix"),
    config: matrixConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("googlechat"),
    config: googleChatConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("rocketchat"),
    config: rocketChatConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("keep"),
    config: keepConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("kook"),
    config: kookConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("dingtalk"),
    config: dingtalkConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("wechatrobot"),
    config: wechatRobotConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("wechatapp"),
    config: wechatAppConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("wxpusher"),
    config: wxPusherConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("igot"),
    config: iGotConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("qmsg"),
    config: qmsgConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("xizhi"),
    config: xiZhiConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("onebot"),
    config: oneBotConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("feishu"),
    config: feishuConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("telegram"),
    config: telegramConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("serverchan"),
    config: serverChanConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("discord"),
    config: discordConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("pushplus"),
    config: pushPlusConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("pushdeer"),
    config: pushDeerConfigSchema,
  }),
  baseChannelSchema.extend({
    type: z.literal("ntfy"),
    config: ntfyConfigSchema,
  }),
]);

export const notificationChannelsStateSchema = z.object({
  version: z.number().int().positive(),
  channels: z.array(notificationChannelSchema).default([]),
});

export const testChannelSchema = z.object({
  channel: notificationChannelSchema,
  message: z.string().min(1).max(500).optional(),
});

export function buildChannelsResponse(
  channels: NotificationChannel[],
): NotificationChannelsResponse {
  return {
    eventSettings: DEFAULT_NOTIFICATION_EVENT_SETTINGS,
    channels,
    supportedChannelTypes: [
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
    ],
  };
}
