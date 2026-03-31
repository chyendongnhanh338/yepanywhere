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
  } = useServerSettings();
  const [automationScript, setAutomationScript] = useState("");
  const [automationDirty, setAutomationDirty] = useState(false);
  const [automationSaving, setAutomationSaving] = useState(false);
  const [automationSaveError, setAutomationSaveError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setAutomationScript(serverSettings?.automationScript ?? "");
    setAutomationDirty(false);
  }, [serverSettings?.automationScript]);

  const handleSaveAutomationScript = async () => {
    setAutomationSaving(true);
    setAutomationSaveError(null);
    try {
      await updateServerSetting("automationScript", automationScript);
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
        Configure server-side JavaScript callbacks that run when approvals,
        questions, paused sessions, or queued messages occur.
      </p>

      <div className="settings-group">
        <div className="settings-item">
          <div className="settings-item-info">
            <strong>Enable Automation</strong>
            <p>
              Run the configured callback whenever one of the selected event
              types occurs.
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
              Choose which session events should invoke the automation hook.
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
            <strong>Automation Script</strong>
            <p>
              Define `onEvent(ctx)` to inspect the event, call helpers, and
              automate replies.
            </p>
          </div>
          <textarea
            className="settings-textarea"
            rows={12}
            value={automationScript}
            onChange={(e) => {
              setAutomationScript(e.target.value);
              setAutomationDirty(
                e.target.value !== (serverSettings?.automationScript ?? ""),
              );
              setAutomationSaveError(null);
            }}
            placeholder={
              "async function onEvent(ctx) {\n  ctx.log(ctx.event.type);\n  // await ctx.actions.sendCommand('model', 'sonnet');\n}"
            }
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
              Helpers include `ctx.log(...)`, `ctx.http.request(...)`, and
              `ctx.actions.*`, `ctx.context.*`.
            </span>
            <button
              type="button"
              className="settings-button"
              disabled={!automationDirty || automationSaving}
              onClick={handleSaveAutomationScript}
            >
              {automationSaving ? "Saving..." : "Save"}
            </button>
          </div>
          {(automationSaveError || error) && (
            <p className="settings-warning">{automationSaveError || error}</p>
          )}
          <p className="settings-hint" style={{ marginTop: "var(--space-2)" }}>
            Event shape: `ctx.event.project.*`, `ctx.event.session.*`,
            `ctx.event.process.*`, and `ctx.event.tool.*` for waiting-input
            events only.
          </p>
          <p className="settings-hint">
            Mutating helpers respect Dry Run. `sendCommand("model", "sonnet")`
            queues `/model sonnet`.
          </p>
          <p className="settings-hint">
            `ctx.context.*` can modify both global instructions and
            session-level variables for the current session.
          </p>
        </div>
      </div>
    </section>
  );
}
