import type {
  BackendNotificationChannel,
  BackendNotificationChannelType,
} from "../api/client";

type TranslationKey = string;

export interface ChannelFieldOption {
  value: string;
  label: string;
}

export interface ChannelFieldConfig {
  key: string;
  labelKey: TranslationKey;
  input: "text" | "password" | "number" | "select";
  placeholderKey?: TranslationKey;
  options?: ChannelFieldOption[];
  visibleWhen?: (channel: BackendNotificationChannel) => boolean;
}

export interface ChannelDefinition {
  type: BackendNotificationChannelType;
  labelKey: TranslationKey;
  defaultChannel: (
    id: string,
    eventTypes: BackendNotificationChannel["eventTypes"],
  ) => BackendNotificationChannel;
  fields: ChannelFieldConfig[];
}

export const CHANNEL_TYPE_ORDER: BackendNotificationChannelType[] = [
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
  "telegram",
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
  "serverchan",
  "discord",
  "pushplus",
  "pushdeer",
  "ntfy",
];

export const CHANNEL_DEFINITIONS: Record<
  BackendNotificationChannelType,
  ChannelDefinition
> = {
  gotify: {
    type: "gotify",
    labelKey: "notificationsBackendGotify",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Gotify",
      enabled: true,
      type: "gotify",
      eventTypes,
      config: {
        serverUrl: "",
        applicationToken: "",
        priority: 8,
      },
    }),
    fields: [
      {
        key: "serverUrl",
        labelKey: "notificationsBackendGotifyServerUrl",
        input: "text",
      },
      {
        key: "applicationToken",
        labelKey: "notificationsBackendGotifyApplicationToken",
        input: "password",
      },
      {
        key: "priority",
        labelKey: "notificationsBackendGotifyPriority",
        input: "number",
      },
    ],
  },
  webhook: {
    type: "webhook",
    labelKey: "notificationsBackendWebhook",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Webhook",
      enabled: true,
      type: "webhook",
      eventTypes,
      config: {
        url: "",
        method: "post",
      },
    }),
    fields: [
      {
        key: "url",
        labelKey: "notificationsBackendWebhookUrl",
        input: "text",
      },
      {
        key: "method",
        labelKey: "notificationsBackendWebhookMethod",
        input: "select",
        options: [
          { value: "post", label: "POST" },
          { value: "get", label: "GET" },
        ],
      },
    ],
  },
  slack: {
    type: "slack",
    labelKey: "notificationsBackendSlack",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Slack",
      enabled: true,
      type: "slack",
      eventTypes,
      config: {
        webhook: "",
        channel: "",
        username: "",
      },
    }),
    fields: [
      {
        key: "webhook",
        labelKey: "notificationsBackendSlackWebhook",
        input: "text",
      },
      {
        key: "channel",
        labelKey: "notificationsBackendSlackChannel",
        input: "text",
      },
      {
        key: "username",
        labelKey: "notificationsBackendSlackUsername",
        input: "text",
      },
    ],
  },
  teams: {
    type: "teams",
    labelKey: "notificationsBackendTeams",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Teams",
      enabled: true,
      type: "teams",
      eventTypes,
      config: {
        webhook: "",
      },
    }),
    fields: [
      {
        key: "webhook",
        labelKey: "notificationsBackendTeamsWebhook",
        input: "text",
      },
    ],
  },
  mattermost: {
    type: "mattermost",
    labelKey: "notificationsBackendMattermost",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Mattermost",
      enabled: true,
      type: "mattermost",
      eventTypes,
      config: {
        webhook: "",
        username: "",
        channel: "",
      },
    }),
    fields: [
      {
        key: "webhook",
        labelKey: "notificationsBackendMattermostWebhook",
        input: "text",
      },
      {
        key: "username",
        labelKey: "notificationsBackendMattermostUsername",
        input: "text",
      },
      {
        key: "channel",
        labelKey: "notificationsBackendMattermostChannel",
        input: "text",
      },
    ],
  },
  bark: {
    type: "bark",
    labelKey: "notificationsBackendBark",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Bark",
      enabled: true,
      type: "bark",
      eventTypes,
      config: {
        endpoint: "",
      },
    }),
    fields: [
      {
        key: "endpoint",
        labelKey: "notificationsBackendBarkEndpoint",
        input: "text",
      },
    ],
  },
  line: {
    type: "line",
    labelKey: "notificationsBackendLine",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "LINE",
      enabled: true,
      type: "line",
      eventTypes,
      config: {
        channelAccessToken: "",
        userId: "",
      },
    }),
    fields: [
      {
        key: "channelAccessToken",
        labelKey: "notificationsBackendLineChannelAccessToken",
        input: "password",
      },
      {
        key: "userId",
        labelKey: "notificationsBackendLineUserId",
        input: "text",
      },
    ],
  },
  pushover: {
    type: "pushover",
    labelKey: "notificationsBackendPushover",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Pushover",
      enabled: true,
      type: "pushover",
      eventTypes,
      config: {
        userKey: "",
        appToken: "",
      },
    }),
    fields: [
      {
        key: "userKey",
        labelKey: "notificationsBackendPushoverUserKey",
        input: "password",
      },
      {
        key: "appToken",
        labelKey: "notificationsBackendPushoverAppToken",
        input: "password",
      },
    ],
  },
  pushbullet: {
    type: "pushbullet",
    labelKey: "notificationsBackendPushbullet",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Pushbullet",
      enabled: true,
      type: "pushbullet",
      eventTypes,
      config: {
        accessToken: "",
      },
    }),
    fields: [
      {
        key: "accessToken",
        labelKey: "notificationsBackendPushbulletAccessToken",
        input: "password",
      },
    ],
  },
  matrix: {
    type: "matrix",
    labelKey: "notificationsBackendMatrix",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Matrix",
      enabled: true,
      type: "matrix",
      eventTypes,
      config: {
        homeserverUrl: "",
        accessToken: "",
        roomId: "",
      },
    }),
    fields: [
      {
        key: "homeserverUrl",
        labelKey: "notificationsBackendMatrixHomeserverUrl",
        input: "text",
      },
      {
        key: "accessToken",
        labelKey: "notificationsBackendMatrixAccessToken",
        input: "password",
      },
      {
        key: "roomId",
        labelKey: "notificationsBackendMatrixRoomId",
        input: "text",
      },
    ],
  },
  googlechat: {
    type: "googlechat",
    labelKey: "notificationsBackendGoogleChat",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Google Chat",
      enabled: true,
      type: "googlechat",
      eventTypes,
      config: {
        webhook: "",
      },
    }),
    fields: [
      {
        key: "webhook",
        labelKey: "notificationsBackendGoogleChatWebhook",
        input: "text",
      },
    ],
  },
  rocketchat: {
    type: "rocketchat",
    labelKey: "notificationsBackendRocketChat",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Rocket.Chat",
      enabled: true,
      type: "rocketchat",
      eventTypes,
      config: {
        webhook: "",
        channel: "",
        username: "",
      },
    }),
    fields: [
      {
        key: "webhook",
        labelKey: "notificationsBackendRocketChatWebhook",
        input: "text",
      },
      {
        key: "channel",
        labelKey: "notificationsBackendRocketChatChannel",
        input: "text",
      },
      {
        key: "username",
        labelKey: "notificationsBackendRocketChatUsername",
        input: "text",
      },
    ],
  },
  keep: {
    type: "keep",
    labelKey: "notificationsBackendKeep",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Keep",
      enabled: true,
      type: "keep",
      eventTypes,
      config: {
        webhookUrl: "",
        apiKey: "",
      },
    }),
    fields: [
      {
        key: "webhookUrl",
        labelKey: "notificationsBackendKeepWebhookUrl",
        input: "text",
      },
      {
        key: "apiKey",
        labelKey: "notificationsBackendKeepApiKey",
        input: "password",
      },
    ],
  },
  kook: {
    type: "kook",
    labelKey: "notificationsBackendKook",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Kook",
      enabled: true,
      type: "kook",
      eventTypes,
      config: {
        botToken: "",
        channelId: "",
      },
    }),
    fields: [
      {
        key: "botToken",
        labelKey: "notificationsBackendKookBotToken",
        input: "password",
      },
      {
        key: "channelId",
        labelKey: "notificationsBackendKookChannelId",
        input: "text",
      },
    ],
  },
  telegram: {
    type: "telegram",
    labelKey: "notificationsBackendTelegram",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Telegram",
      enabled: true,
      type: "telegram",
      eventTypes,
      config: {
        botToken: "",
        chatId: "",
      },
    }),
    fields: [
      {
        key: "botToken",
        labelKey: "notificationsBackendTelegramBotToken",
        placeholderKey: "notificationsBackendTelegramBotTokenPlaceholder",
        input: "password",
      },
      {
        key: "chatId",
        labelKey: "notificationsBackendTelegramChatId",
        placeholderKey: "notificationsBackendTelegramChatIdPlaceholder",
        input: "text",
      },
    ],
  },
  customemail: {
    type: "customemail",
    labelKey: "notificationsBackendCustomEmail",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Custom Email",
      enabled: true,
      type: "customemail",
      eventTypes,
      config: {
        emailType: "text",
        toAddress: "",
        authUser: "",
        authPass: "",
        host: "",
        port: 465,
      },
    }),
    fields: [
      {
        key: "emailType",
        labelKey: "notificationsBackendCustomEmailType",
        input: "select",
        options: [
          { value: "text", label: "text" },
          { value: "html", label: "html" },
        ],
      },
      {
        key: "toAddress",
        labelKey: "notificationsBackendCustomEmailTo",
        input: "text",
      },
      {
        key: "authUser",
        labelKey: "notificationsBackendCustomEmailAuthUser",
        input: "text",
      },
      {
        key: "authPass",
        labelKey: "notificationsBackendCustomEmailAuthPass",
        input: "password",
      },
      {
        key: "host",
        labelKey: "notificationsBackendCustomEmailHost",
        input: "text",
      },
      {
        key: "port",
        labelKey: "notificationsBackendCustomEmailPort",
        input: "number",
      },
    ],
  },
  dingtalk: {
    type: "dingtalk",
    labelKey: "notificationsBackendDingtalk",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Dingtalk",
      enabled: true,
      type: "dingtalk",
      eventTypes,
      config: { accessToken: "", secret: "" },
    }),
    fields: [
      {
        key: "accessToken",
        labelKey: "notificationsBackendAccessToken",
        input: "text",
      },
      { key: "secret", labelKey: "notificationsBackendSecret", input: "text" },
    ],
  },
  wechatrobot: {
    type: "wechatrobot",
    labelKey: "notificationsBackendWechatRobot",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Wechat Robot",
      enabled: true,
      type: "wechatrobot",
      eventTypes,
      config: { key: "" },
    }),
    fields: [
      { key: "key", labelKey: "notificationsBackendKey", input: "text" },
    ],
  },
  wechatapp: {
    type: "wechatapp",
    labelKey: "notificationsBackendWechatApp",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Wechat App",
      enabled: true,
      type: "wechatapp",
      eventTypes,
      config: {
        corpId: "",
        secret: "",
        agentId: 1000001,
        toUser: "@all",
      },
    }),
    fields: [
      {
        key: "corpId",
        labelKey: "notificationsBackendWechatAppCorpId",
        input: "text",
      },
      { key: "secret", labelKey: "notificationsBackendSecret", input: "text" },
      {
        key: "agentId",
        labelKey: "notificationsBackendWechatAppAgentId",
        input: "number",
      },
      {
        key: "toUser",
        labelKey: "notificationsBackendWechatAppToUser",
        input: "text",
      },
    ],
  },
  wxpusher: {
    type: "wxpusher",
    labelKey: "notificationsBackendWxPusher",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "WxPusher",
      enabled: true,
      type: "wxpusher",
      eventTypes,
      config: { appToken: "", uid: "" },
    }),
    fields: [
      {
        key: "appToken",
        labelKey: "notificationsBackendWxPusherAppToken",
        input: "text",
      },
      {
        key: "uid",
        labelKey: "notificationsBackendWxPusherUid",
        input: "text",
      },
    ],
  },
  igot: {
    type: "igot",
    labelKey: "notificationsBackendIGot",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "iGot",
      enabled: true,
      type: "igot",
      eventTypes,
      config: { key: "" },
    }),
    fields: [
      { key: "key", labelKey: "notificationsBackendKey", input: "text" },
    ],
  },
  qmsg: {
    type: "qmsg",
    labelKey: "notificationsBackendQmsg",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Qmsg",
      enabled: true,
      type: "qmsg",
      eventTypes,
      config: { key: "", qq: "", bot: "" },
    }),
    fields: [
      { key: "key", labelKey: "notificationsBackendKey", input: "text" },
      { key: "qq", labelKey: "notificationsBackendQmsgQq", input: "text" },
      { key: "bot", labelKey: "notificationsBackendQmsgBot", input: "text" },
    ],
  },
  xizhi: {
    type: "xizhi",
    labelKey: "notificationsBackendXiZhi",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "XiZhi",
      enabled: true,
      type: "xizhi",
      eventTypes,
      config: { key: "" },
    }),
    fields: [
      { key: "key", labelKey: "notificationsBackendKey", input: "text" },
    ],
  },
  onebot: {
    type: "onebot",
    labelKey: "notificationsBackendOneBot",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "OneBot",
      enabled: true,
      type: "onebot",
      eventTypes,
      config: {
        baseUrl: "",
        accessToken: "",
        messageType: "private",
      },
    }),
    fields: [
      {
        key: "baseUrl",
        labelKey: "notificationsBackendOneBotBaseUrl",
        input: "text",
      },
      {
        key: "accessToken",
        labelKey: "notificationsBackendAccessToken",
        input: "text",
      },
      {
        key: "messageType",
        labelKey: "notificationsBackendOneBotMessageType",
        input: "select",
        options: [
          { value: "private", label: "private" },
          { value: "group", label: "group" },
        ],
      },
      {
        key: "userId",
        labelKey: "notificationsBackendOneBotUserId",
        input: "number",
        visibleWhen: (channel) =>
          channel.type === "onebot" && channel.config.messageType === "private",
      },
      {
        key: "groupId",
        labelKey: "notificationsBackendOneBotGroupId",
        input: "number",
        visibleWhen: (channel) =>
          channel.type === "onebot" && channel.config.messageType === "group",
      },
    ],
  },
  feishu: {
    type: "feishu",
    labelKey: "notificationsBackendFeishu",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Feishu",
      enabled: true,
      type: "feishu",
      eventTypes,
      config: {
        appId: "",
        appSecret: "",
        receiveIdType: "open_id",
        receiveId: "",
      },
    }),
    fields: [
      {
        key: "appId",
        labelKey: "notificationsBackendFeishuAppId",
        input: "text",
      },
      {
        key: "appSecret",
        labelKey: "notificationsBackendFeishuAppSecret",
        input: "text",
      },
      {
        key: "receiveIdType",
        labelKey: "notificationsBackendFeishuReceiveIdType",
        input: "select",
        options: [
          { value: "open_id", label: "open_id" },
          { value: "user_id", label: "user_id" },
          { value: "union_id", label: "union_id" },
          { value: "email", label: "email" },
          { value: "chat_id", label: "chat_id" },
        ],
      },
      {
        key: "receiveId",
        labelKey: "notificationsBackendFeishuReceiveId",
        input: "text",
      },
    ],
  },
  serverchan: {
    type: "serverchan",
    labelKey: "notificationsBackendServerChan",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "ServerChan",
      enabled: true,
      type: "serverchan",
      eventTypes,
      config: { sendKey: "" },
    }),
    fields: [
      {
        key: "sendKey",
        labelKey: "notificationsBackendServerChanSendKey",
        placeholderKey: "notificationsBackendServerChanSendKeyPlaceholder",
        input: "password",
      },
    ],
  },
  discord: {
    type: "discord",
    labelKey: "notificationsBackendDiscord",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "Discord",
      enabled: true,
      type: "discord",
      eventTypes,
      config: { webhook: "", username: "" },
    }),
    fields: [
      {
        key: "webhook",
        labelKey: "notificationsBackendDiscordWebhook",
        placeholderKey: "notificationsBackendDiscordWebhookPlaceholder",
        input: "text",
      },
      {
        key: "username",
        labelKey: "notificationsBackendDiscordUsername",
        placeholderKey: "notificationsBackendDiscordUsernamePlaceholder",
        input: "text",
      },
    ],
  },
  pushplus: {
    type: "pushplus",
    labelKey: "notificationsBackendPushPlus",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "PushPlus",
      enabled: true,
      type: "pushplus",
      eventTypes,
      config: {
        token: "",
        template: "html",
        channel: "wechat",
      },
    }),
    fields: [
      {
        key: "token",
        labelKey: "notificationsBackendPushPlusToken",
        placeholderKey: "notificationsBackendPushPlusTokenPlaceholder",
        input: "password",
      },
      {
        key: "channel",
        labelKey: "notificationsBackendPushPlusChannel",
        input: "select",
        options: [
          { value: "wechat", label: "wechat" },
          { value: "webhook", label: "webhook" },
          { value: "mail", label: "mail" },
          { value: "cp", label: "cp" },
        ],
      },
      {
        key: "template",
        labelKey: "notificationsBackendPushPlusTemplate",
        input: "select",
        options: [
          { value: "html", label: "html" },
          { value: "json", label: "json" },
          { value: "cloudMonitor", label: "cloudMonitor" },
        ],
      },
    ],
  },
  pushdeer: {
    type: "pushdeer",
    labelKey: "notificationsBackendPushDeer",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "PushDeer",
      enabled: true,
      type: "pushdeer",
      eventTypes,
      config: { pushKey: "", endpoint: "", type: "markdown" },
    }),
    fields: [
      {
        key: "pushKey",
        labelKey: "notificationsBackendPushDeerKey",
        placeholderKey: "notificationsBackendPushDeerKeyPlaceholder",
        input: "password",
      },
      {
        key: "endpoint",
        labelKey: "notificationsBackendPushDeerEndpoint",
        placeholderKey: "notificationsBackendPushDeerEndpointPlaceholder",
        input: "text",
      },
      {
        key: "type",
        labelKey: "notificationsBackendPushDeerType",
        input: "select",
        options: [
          { value: "text", label: "text" },
          { value: "markdown", label: "markdown" },
          { value: "image", label: "image" },
        ],
      },
    ],
  },
  ntfy: {
    type: "ntfy",
    labelKey: "notificationsBackendNtfy",
    defaultChannel: (id, eventTypes) => ({
      id,
      name: "ntfy",
      enabled: true,
      type: "ntfy",
      eventTypes,
      config: {
        url: "https://ntfy.sh",
        topic: "",
        authenticationMethod: "none",
        accessToken: "",
        username: "",
        password: "",
        priority: 3,
        tags: [],
      },
    }),
    fields: [
      {
        key: "url",
        labelKey: "notificationsBackendNtfyUrl",
        placeholderKey: "notificationsBackendNtfyUrlPlaceholder",
        input: "text",
      },
      {
        key: "topic",
        labelKey: "notificationsBackendNtfyTopic",
        placeholderKey: "notificationsBackendNtfyTopicPlaceholder",
        input: "text",
      },
      {
        key: "authenticationMethod",
        labelKey: "notificationsBackendNtfyAuthenticationMethod",
        input: "select",
        options: [
          { value: "none", label: "None" },
          { value: "accessToken", label: "Access Token" },
          { value: "usernamePassword", label: "Username / Password" },
        ],
      },
      {
        key: "accessToken",
        labelKey: "notificationsBackendAccessToken",
        input: "password",
        visibleWhen: (channel) =>
          channel.type === "ntfy" &&
          channel.config.authenticationMethod === "accessToken",
      },
      {
        key: "username",
        labelKey: "notificationsBackendUsername",
        input: "text",
        visibleWhen: (channel) =>
          channel.type === "ntfy" &&
          channel.config.authenticationMethod === "usernamePassword",
      },
      {
        key: "password",
        labelKey: "notificationsBackendPassword",
        input: "password",
        visibleWhen: (channel) =>
          channel.type === "ntfy" &&
          channel.config.authenticationMethod === "usernamePassword",
      },
      {
        key: "priority",
        labelKey: "notificationsBackendNtfyPriority",
        input: "select",
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "5", label: "5" },
        ],
      },
      {
        key: "tags",
        labelKey: "notificationsBackendNtfyTags",
        placeholderKey: "notificationsBackendNtfyTagsPlaceholder",
        input: "text",
      },
    ],
  },
};

export function createDefaultBackendNotificationChannel(
  type: BackendNotificationChannelType,
  id: string,
): BackendNotificationChannel {
  return CHANNEL_DEFINITIONS[type].defaultChannel(id, {
    toolApproval: true,
    userQuestion: true,
    sessionHalted: true,
  });
}

export function getChannelTypeLabelKey(type: BackendNotificationChannelType) {
  return CHANNEL_DEFINITIONS[type].labelKey;
}
