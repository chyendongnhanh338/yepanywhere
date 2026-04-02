import { createServer } from "node:http";

const port = Number(process.env.PORT || 8787);

function json(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body, null, 2));
}

function shouldRecover(event) {
  return event.type === "session-paused" && event.reason === "error";
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
    json(response, 200, {
      actions: dryRun ? [] : [{ type: "approve" }],
    });
    return;
  }

  if (shouldRecover(event)) {
    const retries = Number(context?.sessionVariables?.retries ?? 0) + 1;
    json(response, 200, {
      actions: [
        { type: "set-session-variable", key: "retries", value: retries },
        {
          type: "resume",
          message:
            "The previous session stopped unexpectedly. Summarize the failure briefly, then continue from the last unfinished step.",
          projectId: event.project.id,
        },
      ],
    });
    return;
  }

  json(response, 200, { actions: [] });
});

server.listen(port, () => {
  console.log(`Webhook example listening on http://127.0.0.1:${port}`);
});
