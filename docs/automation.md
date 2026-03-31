## Automation

Yep Anywhere supports server-side JavaScript callbacks for session automation.

Configure automation in `Settings -> Automation`:

- Enable Automation
- Choose one or more trigger events
- Paste a script that defines `onEvent(ctx)` or `export default async function onEvent(ctx) {}`
- Keep `Dry Run` enabled until the script behavior is verified

### Events

`ctx.event.type` is one of:

- `tool-approval`
- `user-question`
- `session-paused`
- `message-queued`

Stable event structure:

- `ctx.event.project.*`
- `ctx.event.session.*`
- `ctx.event.process.*`
- `ctx.event.tool.*` only for waiting-input events

`ctx.event.project.*`

- `id`
- `name`
- `path`

`ctx.event.session.*`

- `id`
- `lastUserMessageText`
- `queuedMessageText` only for `message-queued`
- `queuedCommandName` only for `message-queued` slash commands
- `queuedCommandArgs` only for `message-queued` slash commands

`ctx.event.process.*`

- `id`
- `provider`
- `model`
- `executor`
- `permissionMode`

`ctx.event.tool.*`

- `request`
- `summary`
- `toolName`

Extra fields by event type:

- `session-paused`: `reason`, `summary`, `lastMessageText`
- `message-queued`: uses `ctx.event.session.queued*`

### Helpers

`ctx.log(...args)`

- Writes to the server log with an `[Automation]` prefix

`ctx.http.fetch(...)`

- Native `fetch`

`ctx.http.request(url, init?)`

- Adds a small convenience layer for JSON requests and responses
- Use `json: {...}` to send JSON
- Use `raw: true` to return the raw `Response`

`ctx.actions.*`

- `approve()`
- `deny(feedback?)`
- `answer(answers, feedback?)`
- `sendMessage(text)`
- `sendCommand(command, args?)`
- `resume(message, options?)`

`ctx.context.*`

- `getGlobalInstructions()`
- `setGlobalInstructions(text?)`
- `appendGlobalInstructions(text, options?)`
- `clearGlobalInstructions()`
- `getSessionVariables()`
- `getSessionVariable(key)`
- `setSessionVariable(key, value)`
- `setSessionVariables(variables)`
- `clearSessionVariables()`

Notes:

- `sendCommand("model", "sonnet")` sends `/model sonnet`
- `sendMessage()` and `sendCommand()` queue a normal session message
- `ctx.context.*` currently modifies the server-wide `globalInstructions` setting
- Session variable helpers persist per-session data in server metadata
- In `Dry Run`, mutating helpers log what they would do but do not apply changes

### Example

```js
export default async function onEvent(ctx) {
  if (ctx.event.type === "message-queued") {
    if (ctx.event.session.queuedCommandName === "model") {
      await ctx.log("model command queued", ctx.event.session.queuedCommandArgs);
    }
    return;
  }

  if (ctx.event.type === "tool-approval") {
    await ctx.actions.approve();
    return;
  }

  if (ctx.event.type === "session-paused" && ctx.event.reason === "error") {
    const retries = Number(ctx.context.getSessionVariable("retries") ?? 0) + 1;
    await ctx.context.setSessionVariable("retries", retries);
    await ctx.context.appendGlobalInstructions(
      "If a tool fails twice, summarize the failure and propose a fallback."
    );
    await ctx.actions.resume("Continue from the last unfinished step.", {
      projectId: ctx.event.project.id,
    });
  }
}
```

### Examples In Repo

- `docs/automation-webhook.example.js`
- `docs/automation-auto-recover.example.js`
