import { Hono } from "hono";
import { ZodError } from "zod";
import type { NotificationChannelService } from "./NotificationChannelService.js";
import type { NotificationDispatcher } from "./NotificationDispatcher.js";
import { notificationChannelSchema, testChannelSchema } from "./schema.js";

export interface NotificationChannelsRoutesDeps {
  channelService: NotificationChannelService;
  dispatcher: NotificationDispatcher;
}

export function createNotificationChannelRoutes(
  deps: NotificationChannelsRoutesDeps,
): Hono {
  const app = new Hono();

  app.get("/", (c) => c.json(deps.channelService.getResponse()));

  app.put("/", async (c) => {
    try {
      const body = await c.req.json<{ channels?: unknown[] }>();
      if (!Array.isArray(body.channels)) {
        return c.json({ error: "channels must be an array" }, 400);
      }
      const channels = body.channels.map((item) =>
        notificationChannelSchema.parse(item),
      );
      await deps.channelService.replaceChannels(channels);
      return c.json(deps.channelService.getResponse());
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          { error: error.issues[0]?.message ?? "Invalid payload" },
          400,
        );
      }
      throw error;
    }
  });

  app.post("/test", async (c) => {
    try {
      const body = testChannelSchema.parse(await c.req.json());
      await deps.dispatcher.testChannel(body.channel, body.message);
      return c.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        return c.json(
          { error: error.issues[0]?.message ?? "Invalid payload" },
          400,
        );
      }
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Test failed",
        },
        500,
      );
    }
  });

  app.post("/:channelId/test", async (c) => {
    const channelId = c.req.param("channelId");
    const message =
      (
        await c.req
          .json<{ message?: string }>()
          .catch(() => ({}) as { message?: string })
      ).message ?? "Test notification from Yep Anywhere";

    const channel = deps.channelService
      .getChannels()
      .find((item) => item.id === channelId);
    if (!channel) {
      return c.json(
        {
          success: false,
          channelId,
          error: "Channel not found",
        },
        404,
      );
    }

    try {
      const response = await deps.dispatcher.testChannel(channel, message);
      return c.json({
        success: response.status >= 200 && response.status < 300,
        channelId,
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          channelId,
          error: error instanceof Error ? error.message : "Test failed",
        },
        500,
      );
    }
  });

  return app;
}
