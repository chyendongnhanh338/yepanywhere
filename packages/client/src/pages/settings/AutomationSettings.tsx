import { useEffect, useState } from "react";
import { useServerSettings } from "../../hooks/useServerSettings";

const AUTOMATION_EVENT_OPTIONS = [
  {
    value: "tool-approval" as const,
    label: "Tool Approvals",
  },
  {
    value: "user-question" as const,
    label: "Questions",
  },
  {
    value: "session-paused" as const,
    label: "Paused Sessions",
  },
  {
    value: "message-queued" as const,
    label: "Queued Messages",
  },
];

export function AutomationSettings() {
  const {
    settings: serverSettings,
    error,
    isLoading,
    updateSetting: updateServerSetting,
    updateSettings: updateServerSettings,
  } = useServerSettings();
  const [automationWebhookUrl, setAutomationWebhookUrl] = useState("");
  const [automationWebhookToken, setAutomationWebhookToken] = useState("");
  const [automationDirty, setAutomationDirty] = useState(false);
  const [automationSaving, setAutomationSaving] = useState(false);
  const [automationSaveError, setAutomationSaveError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setAutomationWebhookUrl(serverSettings?.automationWebhookUrl ?? "");
    setAutomationWebhookToken(serverSettings?.automationWebhookToken ?? "");
    setAutomationDirty(false);
  }, [
    serverSettings?.automationWebhookToken,
    serverSettings?.automationWebhookUrl,
  ]);

  const handleSaveAutomationConfig = async () => {
    setAutomationSaving(true);
    setAutomationSaveError(null);
    try {
      await updateServerSettings({
        automationWebhookUrl: automationWebhookUrl.trim() || undefined,
        automationWebhookToken: automationWebhookToken.trim() || undefined,
      });
      setAutomationDirty(false);
    } catch (saveError) {
      setAutomationSaveError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save automation",
      );
    } finally {
      setAutomationSaving(false);
    }
  };

  if (isLoading && !serverSettings) {
    return (
      <section className="settings-section">
        <h2>Automation</h2>
        <p className="settings-section-description">Loading...</p>
      </section>
    );
  }

  return (
    <section className="settings-section">
      <h2>Automation</h2>
      <p className="settings-section-description">
        Send session events to an external automation webhook and let that
        service decide which follow-up actions to run.
      </p>

      <div className="settings-group">
        <div className="settings-item">
          <div className="settings-item-info">
            <strong>Enable Automation</strong>
            <p>
              Call the configured automation webhook whenever one of the
              selected event types occurs.
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={serverSettings?.automationEnabled ?? false}
              onChange={(e) =>
                updateServerSetting("automationEnabled", e.target.checked)
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div className="settings-item">
          <div className="settings-item-info">
            <strong>Dry Run</strong>
            <p>
              Log automation actions without executing mutating session changes.
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={serverSettings?.automationDryRun ?? true}
              onChange={(e) =>
                updateServerSetting("automationDryRun", e.target.checked)
              }
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div
          className="settings-item"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <div className="settings-item-info">
            <strong>Trigger Events</strong>
            <p>
              Choose which session events should invoke the automation webhook.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              flexWrap: "wrap",
              marginTop: "var(--space-2)",
            }}
          >
            {AUTOMATION_EVENT_OPTIONS.map(({ value, label }) => {
              const current = serverSettings?.automationEventTypes ?? [];
              const checked = current.includes(value);
              return (
                <label key={value} className="settings-hint">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = e.target.checked
                        ? Array.from(new Set([...current, value]))
                        : current.filter((item) => item !== value);
                      void updateServerSetting("automationEventTypes", next);
                    }}
                  />{" "}
                  {label}
                </label>
              );
            })}
          </div>
        </div>

        <div
          className="settings-item"
          style={{ flexDirection: "column", alignItems: "stretch" }}
        >
          <div className="settings-item-info">
            <strong>Automation Webhook</strong>
            <p>
              Configure the external service endpoint that receives automation
              events and returns actions for the server to execute.
            </p>
          </div>
          <input
            type="url"
            className="settings-input"
            value={automationWebhookUrl}
            onChange={(e) => {
              setAutomationWebhookUrl(e.target.value);
              setAutomationDirty(
                e.target.value !==
                  (serverSettings?.automationWebhookUrl ?? "") ||
                  automationWebhookToken !==
                    (serverSettings?.automationWebhookToken ?? ""),
              );
              setAutomationSaveError(null);
            }}
            placeholder="https://automation.example.com/yep-anywhere"
          />
          <input
            type="password"
            className="settings-input"
            value={automationWebhookToken}
            onChange={(e) => {
              setAutomationWebhookToken(e.target.value);
              setAutomationDirty(
                automationWebhookUrl !==
                  (serverSettings?.automationWebhookUrl ?? "") ||
                  e.target.value !==
                    (serverSettings?.automationWebhookToken ?? ""),
              );
              setAutomationSaveError(null);
            }}
            placeholder="Bearer token (optional)"
            style={{ marginTop: "var(--space-2)" }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "var(--space-2)",
            }}
          >
            <span className="settings-hint">
              The server sends the event payload plus current instructions and
              session variables. Your webhook responds with an `actions` array.
            </span>
            <button
              type="button"
              className="settings-button"
              disabled={!automationDirty || automationSaving}
              onClick={handleSaveAutomationConfig}
            >
              {automationSaving ? "Saving..." : "Save"}
            </button>
          </div>
          {(automationSaveError || error) && (
            <p className="settings-warning">{automationSaveError || error}</p>
          )}
          <p className="settings-hint" style={{ marginTop: "var(--space-2)" }}>
            Request body includes `event`, `dryRun`, and `context` with
            `globalInstructions` and `sessionVariables`.
          </p>
          <p className="settings-hint">
            Supported response actions include `approve`, `deny`, `answer`,
            `send-message`, `send-command`, `resume`, and instruction or
            session-variable updates.
          </p>
          <p className="settings-hint">
            Mutating actions still respect Dry Run. Automation-generated queued
            messages are not re-sent back through the `message-queued` trigger.
          </p>
        </div>
      </div>
    </section>
  );
}
