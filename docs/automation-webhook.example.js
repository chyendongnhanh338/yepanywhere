// Generic webhook forwarding strategy for Yep Anywhere automation callbacks.
//
// Paste this into Settings -> Automation -> Callback Script, then:
// - Enable Automation
// - Select the callback events you want to forward
// - Keep Dry Run on until you've verified the outgoing payloads
//
// Event shape:
// - ctx.event.project.*  -> id, name, path
// - ctx.event.session.*  -> id, lastUserMessageText
// - ctx.event.process.*  -> id, provider, model, executor, permissionMode
// - ctx.event.tool.*     -> request, summary, toolName (waiting-input only)

const CONFIG = {
  url: "https://example.com/yep-anywhere/webhook",
  method: "POST",
  headers: {
    Authorization: "Bearer replace-me",
  },
  includeRawToolRequest: false,
};

function buildPayload(event) {
  const payload = {
    type: event.type,
    timestamp: event.timestamp,
    project: event.project,
    session: event.session,
    process: event.process,
  };

  if (event.type === "session-paused") {
    return {
      ...payload,
      reason: event.reason,
      summary: event.summary,
      lastMessageText: event.lastMessageText,
    };
  }

  return {
    ...payload,
    tool: {
      toolName: event.tool.toolName,
      summary: event.tool.summary,
      requestId: event.tool.request.id,
      requestType: event.tool.request.type,
      prompt: event.tool.request.prompt,
      ...(CONFIG.includeRawToolRequest
        ? { request: event.tool.request }
        : null),
    },
  };
}

export default async function onEvent(ctx) {
  const payload = buildPayload(ctx.event);

  await ctx.log("sending automation webhook", {
    url: CONFIG.url,
    type: ctx.event.type,
    project: ctx.event.project.name,
    sessionId: ctx.event.session.id,
  });

  const response = await ctx.http.request(CONFIG.url, {
    method: CONFIG.method,
    headers: CONFIG.headers,
    json: payload,
    raw: true,
  });

  await ctx.log("webhook response", {
    status: response.status,
    statusText: response.statusText,
  });
}
