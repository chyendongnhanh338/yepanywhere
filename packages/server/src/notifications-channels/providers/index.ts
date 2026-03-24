import type { NotificationChannel, NotificationChannelType } from "../types.js";
import { customEmailProvider } from "./providers.js";
import {
  barkProvider,
  dingtalkProvider,
  discordProvider,
  feishuProvider,
  googleChatProvider,
  gotifyProvider,
  iGotProvider,
  keepProvider,
  kookProvider,
  lineProvider,
  matrixProvider,
  mattermostProvider,
  ntfyProvider,
  oneBotProvider,
  pushDeerProvider,
  pushPlusProvider,
  pushbulletProvider,
  pushoverProvider,
  qmsgProvider,
  rocketChatProvider,
  serverChanProvider,
  slackProvider,
  teamsProvider,
  telegramProvider,
  webhookProvider,
  wechatAppProvider,
  wechatRobotProvider,
  wxPusherProvider,
  xiZhiProvider,
} from "./providers.js";
import type { NotificationChannelProvider } from "./types.js";

const providerList = [
  customEmailProvider,
  gotifyProvider,
  webhookProvider,
  slackProvider,
  teamsProvider,
  mattermostProvider,
  barkProvider,
  lineProvider,
  pushoverProvider,
  pushbulletProvider,
  matrixProvider,
  googleChatProvider,
  rocketChatProvider,
  keepProvider,
  kookProvider,
  dingtalkProvider,
  wechatRobotProvider,
  wechatAppProvider,
  wxPusherProvider,
  iGotProvider,
  qmsgProvider,
  xiZhiProvider,
  oneBotProvider,
  feishuProvider,
  telegramProvider,
  serverChanProvider,
  discordProvider,
  pushPlusProvider,
  pushDeerProvider,
  ntfyProvider,
] satisfies NotificationChannelProvider[];

export const notificationProviders = Object.fromEntries(
  providerList.map((provider) => [provider.type, provider]),
) as Record<NotificationChannelType, NotificationChannelProvider>;

export function getNotificationProvider(channel: NotificationChannel) {
  return notificationProviders[channel.type] as NotificationChannelProvider<
    typeof channel
  >;
}
