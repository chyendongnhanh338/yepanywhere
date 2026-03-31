// Auto-recover strategy for Yep Anywhere automation callbacks.
//
// Paste this into Settings -> Automation -> Callback Script, then:
// - Enable Automation
// - Enable the "Session Halted" callback event
// - Keep Dry Run on until you've verified the behavior
//
// Strategy:
// - Recover only when a session pauses because of an error
// - Ignore normal idle/completed pauses to avoid infinite loops
// - Only recover if the last user message mentions "next step"
// - Resume with a short recovery prompt that tells the agent to continue
// - Available helpers also include ctx.actions.sendCommand(...) and ctx.context.*

const CONFIG = {
  recoverOnError: true,
  recoverOnIdle: false,
  recoverOnCompleted: false,
  requiredPhraseInLastMessage: "next step",
  recoveryMessage:
    "The previous session stopped unexpectedly. First summarize the failure briefly, then continue from the last unfinished step without repeating completed work.",
};

function shouldRecover(event) {
  if (event.type !== "session-paused") {
    return false;
  }

  const lastMessageText = event.session.lastUserMessageText || "";
  if (
    CONFIG.requiredPhraseInLastMessage &&
    !lastMessageText.includes(CONFIG.requiredPhraseInLastMessage)
  ) {
    return false;
  }

  if (event.reason === "error") {
    return CONFIG.recoverOnError;
  }

  if (event.reason === "idle") {
    return CONFIG.recoverOnIdle;
  }

  if (event.reason === "completed") {
    return CONFIG.recoverOnCompleted;
  }

  return false;
}

export default async function onEvent(ctx) {
  const { event } = ctx;

  if (!shouldRecover(event)) {
    return;
  }

  await ctx.log("auto-recover triggered", {
    sessionId: event.session.id,
    projectId: event.project.id,
    projectName: event.project.name,
    projectPath: event.project.path,
    reason: event.reason,
    provider: event.process.provider,
    model: event.process.model,
    executor: event.process.executor,
    summary: event.summary,
    lastMessageText: event.session.lastUserMessageText,
  });

  await ctx.actions.resume(CONFIG.recoveryMessage, {
    projectId: event.project.id,
  });
}
