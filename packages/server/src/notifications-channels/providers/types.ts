import type { PushPayload } from "../../push/types.js";
import type { NotificationChannel } from "../types.js";

export interface ProviderMessage {
  title: string;
  body: string;
}

export interface ProviderResponse {
  status: number;
  statusText: string;
}

export interface NotificationChannelProvider<
  TChannel extends NotificationChannel = NotificationChannel,
> {
  readonly type: TChannel["type"];
  send(channel: TChannel, message: ProviderMessage): Promise<ProviderResponse>;
}

export class ProviderError extends Error {
  readonly status?: number;
  readonly statusText?: string;

  constructor(
    message: string,
    options?: { status?: number; statusText?: string },
  ) {
    super(message);
    this.name = "ProviderError";
    this.status = options?.status;
    this.statusText = options?.statusText;
  }
}

export function formatPayload(payload: PushPayload): ProviderMessage {
  switch (payload.type) {
    case "pending-input":
      return {
        title: `[Yep Anywhere] ${payload.projectName} needs attention`,
        body: `${payload.inputType}: ${payload.summary}`,
      };
    case "session-halted":
      return {
        title: `[Yep Anywhere] ${payload.projectName} halted`,
        body: `Reason: ${payload.reason}`,
      };
    case "dismiss":
      return {
        title: "[Yep Anywhere] Notification dismissed",
        body: `Session ${payload.sessionId} no longer needs attention`,
      };
    case "test":
      return {
        title: "[Yep Anywhere] Test notification",
        body: payload.message,
      };
  }
}
