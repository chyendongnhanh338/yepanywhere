import { createServer } from "node:http";

const port = Number(process.env.PORT || 8787);
const yepBaseUrl = process.env.YEP_BASE_URL || "http://127.0.0.1:3400";

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body, null, 2));
}

function shouldRecover(event) {
  return event.type === "session-paused" && event.reason === "error";
}

async function callYep(path, init) {
  const response = await fetch(new URL(path, yepBaseUrl), {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-yep-anywhere": "true",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Yep API failed: ${response.status}`);
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== "POST") {
    json(response, 405, { error: "POST only" });
    return;
  }

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    json(response, 400, { error: "Invalid JSON" });
    return;
  }

  const { event, dryRun, context } = body;
  console.log(
    "[webhook-example]",
    JSON.stringify({ event, dryRun, context }, null, 2),
  );

  if (event.type === "tool-approval") {
    if (!dryRun) {
      await callYep(`/api/sessions/${event.session.id}/input`, {
        method: "POST",
        body: JSON.stringify({
          requestId: event.tool.request.id,
          response: "approve",
        }),
      });
    }
    json(response, 204, null);
    return;
  }

  if (shouldRecover(event)) {
    const retries = Number(context?.sessionVariables?.retries ?? 0) + 1;
    if (!dryRun) {
      await callYep(`/api/sessions/${event.session.id}/variables/retries`, {
        method: "PUT",
        body: JSON.stringify({ value: retries }),
      });
      await callYep(
        `/api/projects/${event.project.id}/sessions/${event.session.id}/resume`,
        {
          method: "POST",
          body: JSON.stringify({
            message:
              "The previous session stopped unexpectedly. Summarize the failure briefly, then continue from the last unfinished step.",
          }),
        },
      );
    }
    json(response, 204, null);
    return;
  }

  json(response, 204, null);
});

server.listen(port, () => {
  console.log(`Webhook example listening on http://127.0.0.1:${port}`);
});
