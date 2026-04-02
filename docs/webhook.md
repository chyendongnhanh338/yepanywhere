## Webhook

Yep Anywhere supports external services driven by webhooks.

Configure the webhook in `Settings -> Webhook`:

- Enable Webhook
- Choose one or more trigger events
- Set the webhook URL
- Optionally set a bearer token
- Keep `Dry Run` enabled until the returned actions are verified

### Events

The server posts a JSON body to your webhook:

```json
{
  "event": {
    "type": "session-paused",
    "timestamp": "2026-04-02T12:34:56.000Z",
    "project": { "id": "...", "name": "repo", "path": "/abs/path" },
    "session": { "id": "session-1", "lastUserMessageText": "continue" },
    "process": {
      "id": "proc-1",
      "provider": "claude",
      "model": "claude-sonnet-4-5",
      "executor": "devbox",
      "permissionMode": "default"
    },
    "reason": "error"
  },
  "dryRun": false,
  "context": {
    "globalInstructions": "Existing instructions",
    "sessionVariables": { "priority": "high" }
  }
}
```

`event.type` is one of:

- `tool-approval`
- `user-question`
- `session-paused`
- `message-queued`

Stable event structure:

- `event.project.*`
- `event.session.*`
- `event.process.*`
- `event.tool.*` only for waiting-input events

Extra fields by event type:

- `session-paused`: `reason`, `summary`, `lastMessageText`
- `message-queued`: `session.queuedMessageText`, `session.queuedCommandName`, `session.queuedCommandArgs`

### Webhook Response

Return a JSON object with an optional `actions` array:

```json
{
  "actions": [
    { "type": "append-global-instructions", "text": "Be concise." },
    { "type": "set-session-variable", "key": "retries", "value": 1 },
    { "type": "resume", "message": "Continue from the last unfinished step." }
  ]
}
```

Supported actions:

- `approve`
- `deny` with optional `feedback`
- `answer` with `answers` and optional `feedback`
- `send-message` with `text`
- `send-command` with `command` and optional `args`
- `resume` with `message` and optional `projectId` or `projectPath`
- `set-global-instructions` with optional `text`
- `append-global-instructions` with `text` and optional `separator`
- `clear-global-instructions`
- `set-session-variable` with `key` and `value`
- `set-session-variables` with `variables`
- `clear-session-variables`

Notes:

- `send-command` queues `/command ...args`
- Webhook-generated queued messages are not emitted back into the `message-queued` trigger
- In `Dry Run`, mutating actions are logged but not applied
- Session variable helpers persist per-session data in server metadata

### Minimal Example

```js
export default {
  async fetch(request) {
    const { event, context } = await request.json();

    if (event.type === "tool-approval") {
      return Response.json({ actions: [{ type: "approve" }] });
    }

    if (event.type === "session-paused" && event.reason === "error") {
      const retries = Number(context.sessionVariables.retries ?? 0) + 1;
      return Response.json({
        actions: [
          { type: "set-session-variable", key: "retries", value: retries },
          {
            type: "append-global-instructions",
            text: "If a tool fails twice, summarize the failure and propose a fallback.",
          },
          {
            type: "resume",
            message: "Continue from the last unfinished step.",
            projectId: event.project.id,
          },
        ],
      });
    }

    return Response.json({ actions: [] });
  },
};
```

### Local Example Server

For a quick local test, run:

```bash
node scripts/webhook-example.js
```

Then set the webhook URL to `http://127.0.0.1:8787`.

### Example In Repo

- `scripts/webhook-example.js`
