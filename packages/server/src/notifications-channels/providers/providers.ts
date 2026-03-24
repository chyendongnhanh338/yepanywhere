import nodemailer from "nodemailer";
import type {
  BarkNotificationChannel,
  CustomEmailNotificationChannel,
  DingtalkNotificationChannel,
  DiscordNotificationChannel,
  FeishuNotificationChannel,
  GoogleChatNotificationChannel,
  GotifyNotificationChannel,
  IGotNotificationChannel,
  KeepNotificationChannel,
  KookNotificationChannel,
  LineNotificationChannel,
  MatrixNotificationChannel,
  MattermostNotificationChannel,
  NtfyNotificationChannel,
  OneBotNotificationChannel,
  PushDeerNotificationChannel,
  PushPlusNotificationChannel,
  PushbulletNotificationChannel,
  PushoverNotificationChannel,
  QmsgNotificationChannel,
  RocketChatNotificationChannel,
  ServerChanNotificationChannel,
  SlackNotificationChannel,
  TeamsNotificationChannel,
  TelegramNotificationChannel,
  WebhookNotificationChannel,
  WechatAppNotificationChannel,
  WechatRobotNotificationChannel,
  WxPusherNotificationChannel,
  XiZhiNotificationChannel,
} from "../types.js";
import { sendFormRequest, sendJsonRequest } from "./http.js";
import type { NotificationChannelProvider } from "./types.js";

export const telegramProvider: NotificationChannelProvider<TelegramNotificationChannel> =
  {
    type: "telegram",
    async send(channel, message) {
      const chatId = Number(channel.config.chatId);
      if (!Number.isFinite(chatId)) {
        throw new Error("Telegram chatId must be a valid integer");
      }

      return await sendJsonRequest(
        `https://api.telegram.org/bot${channel.config.botToken}/sendMessage`,
        {
          body: {
            chat_id: chatId,
            text: `${message.title}\n\n${message.body}`,
            disable_notification: channel.config.disableNotification ?? false,
            link_preview_options: { is_disabled: true },
          },
        },
      );
    },
  };

export const discordProvider: NotificationChannelProvider<DiscordNotificationChannel> =
  {
    type: "discord",
    async send(channel, message) {
      return await sendJsonRequest(channel.config.webhook, {
        body: {
          username: channel.config.username || "Yep Anywhere",
          content: `${message.title}\n${message.body}`,
        },
      });
    },
  };

export const pushPlusProvider: NotificationChannelProvider<PushPlusNotificationChannel> =
  {
    type: "pushplus",
    async send(channel, message) {
      return await sendJsonRequest("https://www.pushplus.plus/send", {
        body: {
          token: channel.config.token,
          title: message.title,
          content: message.body,
          template: channel.config.template ?? "html",
          channel: channel.config.channel,
        },
      });
    },
  };

export const pushDeerProvider: NotificationChannelProvider<PushDeerNotificationChannel> =
  {
    type: "pushdeer",
    async send(channel, message) {
      const endpoint = (
        channel.config.endpoint || "https://api2.pushdeer.com"
      ).replace(/\/+$/, "");
      return await sendJsonRequest(`${endpoint}/message/push`, {
        body: {
          pushkey: channel.config.pushKey,
          text: message.title,
          desp: message.body.replace(/\n/g, "\n\n"),
          type: channel.config.type ?? "markdown",
        },
      });
    },
  };

export const ntfyProvider: NotificationChannelProvider<NtfyNotificationChannel> =
  {
    type: "ntfy",
    async send(channel, message) {
      const headers: Record<string, string> = {};

      if (channel.config.authenticationMethod === "accessToken") {
        if (!channel.config.accessToken) {
          throw new Error("ntfy accessToken is required");
        }
        headers.Authorization = `Bearer ${channel.config.accessToken}`;
      }

      if (channel.config.authenticationMethod === "usernamePassword") {
        if (!channel.config.username || !channel.config.password) {
          throw new Error("ntfy username and password are required");
        }
        headers.Authorization = `Basic ${Buffer.from(
          `${channel.config.username}:${channel.config.password}`,
        ).toString("base64")}`;
      }

      return await sendJsonRequest(channel.config.url, {
        headers,
        body: {
          topic: channel.config.topic,
          title: message.title,
          message: message.body,
          priority: channel.config.priority,
          tags: channel.config.tags,
        },
      });
    },
  };

export const serverChanProvider: NotificationChannelProvider<ServerChanNotificationChannel> =
  {
    type: "serverchan",
    async send(channel, message) {
      const match = channel.config.sendKey.match(/^sctp(\d+)t/i);
      const url = match?.[1]
        ? `https://${match[1]}.push.ft07.com/send/${channel.config.sendKey}.send`
        : `https://sctapi.ftqq.com/${channel.config.sendKey}.send`;

      return await sendJsonRequest(url, {
        body: {
          title: message.title,
          desp: message.body,
          tags: channel.config.tags?.join("|"),
          short: channel.config.short,
        },
      });
    },
  };

export const dingtalkProvider: NotificationChannelProvider<DingtalkNotificationChannel> =
  {
    type: "dingtalk",
    async send(channel, message) {
      const url = new URL(
        `https://oapi.dingtalk.com/robot/send?access_token=${encodeURIComponent(channel.config.accessToken)}`,
      );
      return await sendJsonRequest(url.toString(), {
        body: {
          msgtype: "markdown",
          markdown: {
            title: message.title,
            text: `## ${message.title}\n\n${message.body}`,
          },
        },
      });
    },
  };

export const gotifyProvider: NotificationChannelProvider<GotifyNotificationChannel> =
  {
    type: "gotify",
    async send(channel, message) {
      const serverUrl = channel.config.serverUrl.replace(/\/+$/, "");
      return await sendJsonRequest(
        `${serverUrl}/message?token=${encodeURIComponent(channel.config.applicationToken)}`,
        {
          body: {
            title: message.title,
            message: message.body,
            priority: channel.config.priority ?? 8,
          },
        },
      );
    },
  };

export const webhookProvider: NotificationChannelProvider<WebhookNotificationChannel> =
  {
    type: "webhook",
    async send(channel, message) {
      if (channel.config.method === "get") {
        const url = new URL(channel.config.url);
        url.searchParams.set("title", message.title);
        url.searchParams.set("msg", message.body);
        return await sendJsonRequest(url.toString(), { method: "GET" });
      }

      return await sendJsonRequest(channel.config.url, {
        body: {
          title: message.title,
          msg: message.body,
        },
      });
    },
  };

export const slackProvider: NotificationChannelProvider<SlackNotificationChannel> =
  {
    type: "slack",
    async send(channel, message) {
      return await sendJsonRequest(channel.config.webhook, {
        body: {
          text: `${message.title}\n${message.body}`,
          channel: channel.config.channel,
          username: channel.config.username,
        },
      });
    },
  };

export const teamsProvider: NotificationChannelProvider<TeamsNotificationChannel> =
  {
    type: "teams",
    async send(channel, message) {
      return await sendJsonRequest(channel.config.webhook, {
        body: {
          text: `${message.title}\n${message.body}`,
        },
      });
    },
  };

export const mattermostProvider: NotificationChannelProvider<MattermostNotificationChannel> =
  {
    type: "mattermost",
    async send(channel, message) {
      return await sendJsonRequest(channel.config.webhook, {
        body: {
          text: `${message.title}\n${message.body}`,
          username: channel.config.username || "Yep Anywhere",
          channel: channel.config.channel,
        },
      });
    },
  };

export const barkProvider: NotificationChannelProvider<BarkNotificationChannel> =
  {
    type: "bark",
    async send(channel, message) {
      const endpoint = channel.config.endpoint.replace(/\/+$/, "");
      return await sendJsonRequest(
        `${endpoint}/${encodeURIComponent(message.title)}/${encodeURIComponent(message.body)}`,
        { method: "GET" },
      );
    },
  };

export const lineProvider: NotificationChannelProvider<LineNotificationChannel> =
  {
    type: "line",
    async send(channel, message) {
      return await sendJsonRequest("https://api.line.me/v2/bot/message/push", {
        headers: {
          Authorization: `Bearer ${channel.config.channelAccessToken}`,
        },
        body: {
          to: channel.config.userId,
          messages: [
            {
              type: "text",
              text: `${message.title}\n${message.body}`,
            },
          ],
        },
      });
    },
  };

export const pushoverProvider: NotificationChannelProvider<PushoverNotificationChannel> =
  {
    type: "pushover",
    async send(channel, message) {
      const body = new URLSearchParams({
        user: channel.config.userKey,
        token: channel.config.appToken,
        title: message.title,
        message: message.body,
        html: "1",
      });
      return await sendFormRequest(
        "https://api.pushover.net/1/messages.json",
        body,
      );
    },
  };

export const pushbulletProvider: NotificationChannelProvider<PushbulletNotificationChannel> =
  {
    type: "pushbullet",
    async send(channel, message) {
      return await sendJsonRequest("https://api.pushbullet.com/v2/pushes", {
        headers: {
          "Access-Token": channel.config.accessToken,
        },
        body: {
          type: "note",
          title: message.title,
          body: message.body,
        },
      });
    },
  };

export const matrixProvider: NotificationChannelProvider<MatrixNotificationChannel> =
  {
    type: "matrix",
    async send(channel, message) {
      return await sendJsonRequest(
        `${channel.config.homeserverUrl.replace(/\/+$/, "")}/_matrix/client/r0/rooms/${encodeURIComponent(channel.config.roomId)}/send/m.room.message/${Date.now()}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${channel.config.accessToken}`,
          },
          body: {
            msgtype: "m.text",
            body: `${message.title}\n${message.body}`,
          },
        },
      );
    },
  };

export const googleChatProvider: NotificationChannelProvider<GoogleChatNotificationChannel> =
  {
    type: "googlechat",
    async send(channel, message) {
      return await sendJsonRequest(channel.config.webhook, {
        body: {
          text: `${message.title}\n${message.body}`,
        },
      });
    },
  };

export const rocketChatProvider: NotificationChannelProvider<RocketChatNotificationChannel> =
  {
    type: "rocketchat",
    async send(channel, message) {
      return await sendJsonRequest(channel.config.webhook, {
        body: {
          text: `${message.title}\n${message.body}`,
          channel: channel.config.channel,
          username: channel.config.username,
        },
      });
    },
  };

export const keepProvider: NotificationChannelProvider<KeepNotificationChannel> =
  {
    type: "keep",
    async send(channel, message) {
      const baseUrl = channel.config.webhookUrl.replace(/\/+$/, "");
      return await sendJsonRequest(`${baseUrl}/alerts/event/uptimekuma`, {
        headers: {
          "x-api-key": channel.config.apiKey,
        },
        body: {
          msg: `${message.title}\n${message.body}`,
        },
      });
    },
  };

export const kookProvider: NotificationChannelProvider<KookNotificationChannel> =
  {
    type: "kook",
    async send(channel, message) {
      return await sendJsonRequest(
        "https://www.kookapp.cn/api/v3/message/create",
        {
          headers: {
            Authorization: `Bot ${channel.config.botToken}`,
          },
          body: {
            target_id: channel.config.channelId,
            content: `${message.title}\n${message.body}`,
          },
        },
      );
    },
  };

export const wechatRobotProvider: NotificationChannelProvider<WechatRobotNotificationChannel> =
  {
    type: "wechatrobot",
    async send(channel, message) {
      return await sendJsonRequest(
        `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${encodeURIComponent(channel.config.key)}`,
        {
          body: {
            msgtype: "text",
            text: {
              content: `${message.title}\n${message.body}`,
            },
          },
        },
      );
    },
  };

export const wechatAppProvider: NotificationChannelProvider<WechatAppNotificationChannel> =
  {
    type: "wechatapp",
    async send(channel, message) {
      const tokenResponse = await fetch(
        `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(channel.config.corpId)}&corpsecret=${encodeURIComponent(channel.config.secret)}`,
      );
      const tokenJson = (await tokenResponse.json()) as
        | { access_token?: string; errmsg?: string }
        | undefined;
      if (!tokenResponse.ok || !tokenJson?.access_token) {
        throw new Error(tokenJson?.errmsg || "WechatApp token request failed");
      }

      return await sendJsonRequest(
        `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${encodeURIComponent(tokenJson.access_token)}`,
        {
          body: {
            touser: channel.config.toUser || "@all",
            msgtype: "text",
            agentid: channel.config.agentId,
            text: {
              content: `${message.title}\n${message.body}`,
            },
          },
        },
      );
    },
  };

export const wxPusherProvider: NotificationChannelProvider<WxPusherNotificationChannel> =
  {
    type: "wxpusher",
    async send(channel, message) {
      return await sendJsonRequest(
        "https://wxpusher.zjiecode.com/api/send/message",
        {
          body: {
            appToken: channel.config.appToken,
            content: `${message.title}\n${message.body}`,
            summary: message.title,
            contentType: 1,
            uids: [channel.config.uid],
          },
        },
      );
    },
  };

export const iGotProvider: NotificationChannelProvider<IGotNotificationChannel> =
  {
    type: "igot",
    async send(channel, message) {
      return await sendJsonRequest(
        `https://push.hellyw.com/${encodeURIComponent(channel.config.key)}`,
        {
          body: {
            title: message.title,
            content: message.body,
          },
        },
      );
    },
  };

export const qmsgProvider: NotificationChannelProvider<QmsgNotificationChannel> =
  {
    type: "qmsg",
    async send(channel, message) {
      if (!channel.config.qq) {
        throw new Error("Qmsg qq is required");
      }

      const body = new URLSearchParams({
        key: channel.config.key,
        msg: `${message.title}\n${message.body}`,
        qq: channel.config.qq,
      });
      if (channel.config.bot) {
        body.set("bot", channel.config.bot);
      }

      return await sendFormRequest(
        `https://qmsg.zendee.cn/send/${channel.config.bot || ""}`,
        body,
      );
    },
  };

export const xiZhiProvider: NotificationChannelProvider<XiZhiNotificationChannel> =
  {
    type: "xizhi",
    async send(channel, message) {
      return await sendJsonRequest(
        `https://xizhi.qqoq.net/${encodeURIComponent(channel.config.key)}.send`,
        {
          body: {
            title: message.title,
            content: message.body,
          },
        },
      );
    },
  };

export const oneBotProvider: NotificationChannelProvider<OneBotNotificationChannel> =
  {
    type: "onebot",
    async send(channel, message) {
      const url = new URL(
        "send_msg",
        ensureTrailingSlash(channel.config.baseUrl),
      );
      const body: Record<string, unknown> = {
        auto_escape: true,
        message: `${message.title}\n${message.body}`,
        message_type: channel.config.messageType,
      };

      if (channel.config.messageType === "private") {
        if (!channel.config.userId) {
          throw new Error("OneBot userId is required for private messages");
        }
        body.user_id = channel.config.userId;
      } else {
        if (!channel.config.groupId) {
          throw new Error("OneBot groupId is required for group messages");
        }
        body.group_id = channel.config.groupId;
      }

      return await sendJsonRequest(url.toString(), {
        headers: channel.config.accessToken
          ? {
              Authorization: `Bearer ${channel.config.accessToken}`,
            }
          : undefined,
        body,
      });
    },
  };

export const feishuProvider: NotificationChannelProvider<FeishuNotificationChannel> =
  {
    type: "feishu",
    async send(channel, message) {
      const tenantTokenResponse = await fetch(
        "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            app_id: channel.config.appId,
            app_secret: channel.config.appSecret,
          }),
        },
      );
      const tokenJson = (await tenantTokenResponse.json()) as
        | { tenant_access_token?: string; msg?: string }
        | undefined;
      if (!tenantTokenResponse.ok || !tokenJson?.tenant_access_token) {
        throw new Error(tokenJson?.msg || "Feishu token request failed");
      }

      return await sendJsonRequest(
        `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${encodeURIComponent(channel.config.receiveIdType)}`,
        {
          headers: {
            Authorization: `Bearer ${tokenJson.tenant_access_token}`,
          },
          body: {
            receive_id: channel.config.receiveId,
            msg_type: "text",
            content: JSON.stringify({
              text: `${message.title}\n${message.body}`,
            }),
          },
        },
      );
    },
  };

export const customEmailProvider: NotificationChannelProvider<CustomEmailNotificationChannel> =
  {
    type: "customemail",
    async send(channel, message) {
      const transporter = nodemailer.createTransport({
        host: channel.config.host,
        port: channel.config.port,
        secure: channel.config.port === 465,
        auth: {
          user: channel.config.authUser,
          pass: channel.config.authPass,
        },
      });

      await transporter.sendMail({
        from: channel.config.authUser,
        to: channel.config.toAddress,
        subject: message.title,
        [channel.config.emailType === "html" ? "html" : "text"]: message.body,
      });

      return {
        status: 200,
        statusText: "OK",
      };
    },
  };

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}
