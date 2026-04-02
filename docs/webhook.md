## Webhook

Yep Anywhere supports external services driven by webhooks.

Yep only sends events. Your external service should call Yep's REST API to
approve tools, resume sessions, send messages, or update session variables.

Configure the webhook in `Settings -> Webhook`:

- Enable Webhook
- Choose one or more trigger events
- Set the webhook URL
- Optionally set a bearer token
- Keep `Dry Run` enabled until your external service is verified

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

### Acting On Events

Use Yep's existing REST API from your external service:

- `POST /api/sessions/:id/input`
- `POST /api/sessions/:id/messages`
- `POST /api/projects/:projectId/sessions/:id/resume`
- `PUT /api/settings`
- `GET /api/sessions/:id/variables`
- `PUT /api/sessions/:id/variables`
- `PUT /api/sessions/:id/variables/:key`
- `DELETE /api/sessions/:id/variables`
- `DELETE /api/sessions/:id/variables/:key`

Notes:

- Mutating Yep API requests must include `X-Yep-Anywhere: true`
- Use your existing Yep auth/cookies when the server requires authentication
- Automation-generated queued messages are not emitted back into the `message-queued` trigger
- In `Dry Run`, Yep still sends the event payload, but your external service should skip the follow-up API calls

### Minimal Example

```js
export default {
  async fetch(request) {
    const { event, context } = await request.json();

    if (event.type === "tool-approval") {
      await fetch(`http://127.0.0.1:3400/api/sessions/${event.session.id}/input`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-yep-anywhere": "true",
        },
        body: JSON.stringify({
          requestId: event.tool.request.id,
          response: "approve",
        }),
      });
      return new Response(null, { status: 204 });
    }

    if (event.type === "session-paused" && event.reason === "error") {
      const retries = Number(context.sessionVariables.retries ?? 0) + 1;
      await fetch(
        `http://127.0.0.1:3400/api/sessions/${event.session.id}/variables/retries`,
        {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            "x-yep-anywhere": "true",
          },
          body: JSON.stringify({ value: retries }),
        },
      );
      await fetch(
        `http://127.0.0.1:3400/api/projects/${event.project.id}/sessions/${event.session.id}/resume`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-yep-anywhere": "true",
          },
          body: JSON.stringify({
            message: "Continue from the last unfinished step.",
          }),
        },
      );
      return new Response(null, { status: 204 });
    }

    return new Response(null, { status: 204 });
  },
};
```

### Local Example Server

For a quick local test, run:

```bash
node scripts/webhook-example.js
```

Then set the webhook URL to `http://127.0.0.1:8787`.

Set `YEP_BASE_URL` if your Yep server is not running at `http://127.0.0.1:3400`.

### Example In Repo

- `scripts/webhook-example.js`
