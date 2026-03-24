export type NotificationEventType =
  | "toolApproval"
  | "userQuestion"
  | "sessionHalted";

export type NotificationChannelType =
  | "customemail"
  | "gotify"
  | "webhook"
  | "slack"
  | "teams"
  | "mattermost"
  | "bark"
  | "line"
  | "pushover"
  | "pushbullet"
  | "matrix"
  | "googlechat"
  | "rocketchat"
  | "keep"
  | "kook"
  | "dingtalk"
  | "wechatrobot"
  | "wechatapp"
  | "wxpusher"
  | "igot"
  | "qmsg"
  | "xizhi"
  | "onebot"
  | "feishu"
  | "telegram"
  | "serverchan"
  | "discord"
  | "pushplus"
  | "pushdeer"
  | "ntfy";

export interface CustomEmailChannelConfig {
  emailType: "text" | "html";
  toAddress: string;
  authUser: string;
  authPass: string;
  host: string;
  port: number;
}

export interface DingtalkChannelConfig {
  accessToken: string;
  secret?: string;
}

export interface GotifyChannelConfig {
  serverUrl: string;
  applicationToken: string;
  priority?: number;
}

export interface WebhookChannelConfig {
  url: string;
  method: "post" | "get";
}

export interface SlackChannelConfig {
  webhook: string;
  channel?: string;
  username?: string;
}

export interface TeamsChannelConfig {
  webhook: string;
}

export interface MattermostChannelConfig {
  webhook: string;
  username?: string;
  channel?: string;
}

export interface BarkChannelConfig {
  endpoint: string;
}

export interface LineChannelConfig {
  channelAccessToken: string;
  userId: string;
}

export interface PushoverChannelConfig {
  userKey: string;
  appToken: string;
}

export interface PushbulletChannelConfig {
  accessToken: string;
}

export interface MatrixChannelConfig {
  homeserverUrl: string;
  accessToken: string;
  roomId: string;
}

export interface GoogleChatChannelConfig {
  webhook: string;
}

export interface RocketChatChannelConfig {
  webhook: string;
  channel?: string;
  username?: string;
}

export interface KeepChannelConfig {
  webhookUrl: string;
  apiKey: string;
}

export interface KookChannelConfig {
  botToken: string;
  channelId: string;
}

export interface WechatRobotChannelConfig {
  key: string;
}

export interface WechatAppChannelConfig {
  corpId: string;
  secret: string;
  agentId: number;
  toUser?: string;
}

export interface WxPusherChannelConfig {
  appToken: string;
  uid: string;
}

export interface IGotChannelConfig {
  key: string;
}

export interface QmsgChannelConfig {
  key: string;
  qq?: string;
  bot?: string;
}

export interface XiZhiChannelConfig {
  key: string;
}

export interface OneBotChannelConfig {
  baseUrl: string;
  accessToken?: string;
  messageType: "private" | "group";
  userId?: number;
  groupId?: number;
}

export interface FeishuChannelConfig {
  appId: string;
  appSecret: string;
  receiveIdType: "open_id" | "user_id" | "union_id" | "email" | "chat_id";
  receiveId: string;
}

export interface NotificationEventSettings {
  toolApproval: boolean;
  userQuestion: boolean;
  sessionHalted: boolean;
}

export const DEFAULT_NOTIFICATION_EVENT_SETTINGS: NotificationEventSettings = {
  toolApproval: true,
  userQuestion: true,
  sessionHalted: true,
};

export interface TelegramChannelConfig {
  botToken: string;
  chatId: string;
  disableNotification?: boolean;
}

export interface ServerChanChannelConfig {
  sendKey: string;
  tags?: string[];
  short?: string;
}

export interface DiscordChannelConfig {
  webhook: string;
  username?: string;
}

export interface PushPlusChannelConfig {
  token: string;
  template?: "html" | "json" | "cloudMonitor";
  channel?: "wechat" | "webhook" | "mail" | "cp";
}

export interface PushDeerChannelConfig {
  pushKey: string;
  endpoint?: string;
  type?: "text" | "markdown" | "image";
}

export interface NtfyChannelConfig {
  url: string;
  topic: string;
  authenticationMethod?: "none" | "accessToken" | "usernamePassword";
  accessToken?: string;
  username?: string;
  password?: string;
  priority?: 1 | 2 | 3 | 4 | 5;
  tags?: string[];
}

export interface NotificationChannelBase {
  id: string;
  type: NotificationChannelType;
  enabled: boolean;
  name: string;
  eventTypes: NotificationEventSettings;
}

export interface CustomEmailNotificationChannel
  extends NotificationChannelBase {
  type: "customemail";
  config: CustomEmailChannelConfig;
}

export interface DingtalkNotificationChannel extends NotificationChannelBase {
  type: "dingtalk";
  config: DingtalkChannelConfig;
}

export interface GotifyNotificationChannel extends NotificationChannelBase {
  type: "gotify";
  config: GotifyChannelConfig;
}

export interface WebhookNotificationChannel extends NotificationChannelBase {
  type: "webhook";
  config: WebhookChannelConfig;
}

export interface SlackNotificationChannel extends NotificationChannelBase {
  type: "slack";
  config: SlackChannelConfig;
}

export interface TeamsNotificationChannel extends NotificationChannelBase {
  type: "teams";
  config: TeamsChannelConfig;
}

export interface MattermostNotificationChannel extends NotificationChannelBase {
  type: "mattermost";
  config: MattermostChannelConfig;
}

export interface BarkNotificationChannel extends NotificationChannelBase {
  type: "bark";
  config: BarkChannelConfig;
}

export interface LineNotificationChannel extends NotificationChannelBase {
  type: "line";
  config: LineChannelConfig;
}

export interface PushoverNotificationChannel extends NotificationChannelBase {
  type: "pushover";
  config: PushoverChannelConfig;
}

export interface PushbulletNotificationChannel extends NotificationChannelBase {
  type: "pushbullet";
  config: PushbulletChannelConfig;
}

export interface MatrixNotificationChannel extends NotificationChannelBase {
  type: "matrix";
  config: MatrixChannelConfig;
}

export interface GoogleChatNotificationChannel extends NotificationChannelBase {
  type: "googlechat";
  config: GoogleChatChannelConfig;
}

export interface RocketChatNotificationChannel extends NotificationChannelBase {
  type: "rocketchat";
  config: RocketChatChannelConfig;
}

export interface KeepNotificationChannel extends NotificationChannelBase {
  type: "keep";
  config: KeepChannelConfig;
}

export interface KookNotificationChannel extends NotificationChannelBase {
  type: "kook";
  config: KookChannelConfig;
}

export interface WechatRobotNotificationChannel
  extends NotificationChannelBase {
  type: "wechatrobot";
  config: WechatRobotChannelConfig;
}

export interface WechatAppNotificationChannel extends NotificationChannelBase {
  type: "wechatapp";
  config: WechatAppChannelConfig;
}

export interface WxPusherNotificationChannel extends NotificationChannelBase {
  type: "wxpusher";
  config: WxPusherChannelConfig;
}

export interface IGotNotificationChannel extends NotificationChannelBase {
  type: "igot";
  config: IGotChannelConfig;
}

export interface QmsgNotificationChannel extends NotificationChannelBase {
  type: "qmsg";
  config: QmsgChannelConfig;
}

export interface XiZhiNotificationChannel extends NotificationChannelBase {
  type: "xizhi";
  config: XiZhiChannelConfig;
}

export interface OneBotNotificationChannel extends NotificationChannelBase {
  type: "onebot";
  config: OneBotChannelConfig;
}

export interface FeishuNotificationChannel extends NotificationChannelBase {
  type: "feishu";
  config: FeishuChannelConfig;
}

export interface TelegramNotificationChannel extends NotificationChannelBase {
  type: "telegram";
  config: TelegramChannelConfig;
}

export interface ServerChanNotificationChannel extends NotificationChannelBase {
  type: "serverchan";
  config: ServerChanChannelConfig;
}

export interface DiscordNotificationChannel extends NotificationChannelBase {
  type: "discord";
  config: DiscordChannelConfig;
}

export interface PushPlusNotificationChannel extends NotificationChannelBase {
  type: "pushplus";
  config: PushPlusChannelConfig;
}

export interface PushDeerNotificationChannel extends NotificationChannelBase {
  type: "pushdeer";
  config: PushDeerChannelConfig;
}

export interface NtfyNotificationChannel extends NotificationChannelBase {
  type: "ntfy";
  config: NtfyChannelConfig;
}

export type NotificationChannel =
  | CustomEmailNotificationChannel
  | GotifyNotificationChannel
  | WebhookNotificationChannel
  | SlackNotificationChannel
  | TeamsNotificationChannel
  | MattermostNotificationChannel
  | BarkNotificationChannel
  | LineNotificationChannel
  | PushoverNotificationChannel
  | PushbulletNotificationChannel
  | MatrixNotificationChannel
  | GoogleChatNotificationChannel
  | RocketChatNotificationChannel
  | KeepNotificationChannel
  | KookNotificationChannel
  | DingtalkNotificationChannel
  | WechatRobotNotificationChannel
  | WechatAppNotificationChannel
  | WxPusherNotificationChannel
  | IGotNotificationChannel
  | QmsgNotificationChannel
  | XiZhiNotificationChannel
  | OneBotNotificationChannel
  | FeishuNotificationChannel
  | TelegramNotificationChannel
  | ServerChanNotificationChannel
  | DiscordNotificationChannel
  | PushPlusNotificationChannel
  | PushDeerNotificationChannel
  | NtfyNotificationChannel;

export interface NotificationChannelsState {
  version: number;
  channels: NotificationChannel[];
}

export interface NotificationChannelsResponse {
  eventSettings: NotificationEventSettings;
  channels: NotificationChannel[];
  supportedChannelTypes: NotificationChannelType[];
}
