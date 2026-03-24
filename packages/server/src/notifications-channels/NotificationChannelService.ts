import * as fs from "node:fs/promises";
import * as path from "node:path";
import { notificationChannelsStateSchema } from "./schema.js";
import { buildChannelsResponse } from "./schema.js";
import type {
  NotificationChannel,
  NotificationChannelsResponse,
  NotificationChannelsState,
} from "./types.js";

const CURRENT_VERSION = 1;

export interface NotificationChannelServiceOptions {
  dataDir: string;
}

export class NotificationChannelService {
  private readonly filePath: string;
  private state: NotificationChannelsState = {
    version: CURRENT_VERSION,
    channels: [],
  };
  private initialized = false;

  constructor(options: NotificationChannelServiceOptions) {
    this.filePath = path.join(options.dataDir, "notification-channels.json");
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    try {
      const content = await fs.readFile(this.filePath, "utf-8");
      this.state = notificationChannelsStateSchema.parse(JSON.parse(content));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.warn(
          "[NotificationChannelService] Failed to load state, using defaults:",
          error,
        );
      }
      await this.save();
    }
    this.initialized = true;
  }

  getChannels(): NotificationChannel[] {
    this.ensureInitialized();
    return structuredClone(this.state.channels);
  }

  getResponse(): NotificationChannelsResponse {
    this.ensureInitialized();
    return buildChannelsResponse(this.getChannels());
  }

  async replaceChannels(channels: NotificationChannel[]): Promise<void> {
    this.ensureInitialized();
    this.state.channels = structuredClone(channels);
    await this.save();
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        "NotificationChannelService not initialized. Call initialize() first.",
      );
    }
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(
      this.filePath,
      JSON.stringify(this.state, null, 2),
      "utf-8",
    );
  }
}
