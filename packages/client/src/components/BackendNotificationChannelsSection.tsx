import { useState } from "react";
import type { BackendNotificationChannel } from "../api/client";
import { useBackendNotificationChannels } from "../hooks/useBackendNotificationChannels";
import { useI18n } from "../i18n";
import { BackendNotificationChannelFields } from "./BackendNotificationChannelFields";
import {
  CHANNEL_TYPE_ORDER,
  getChannelTypeLabelKey,
} from "./backendNotificationChannelConfig";

function updateChannel(
  channels: BackendNotificationChannel[],
  channelId: string,
  updater: (channel: BackendNotificationChannel) => BackendNotificationChannel,
): BackendNotificationChannel[] {
  return channels.map((channel) =>
    channel.id === channelId ? updater(channel) : channel,
  );
}

function getChannelTypeLabel(
  channel: BackendNotificationChannel,
  t: (key: never, vars?: Record<string, string | number>) => string,
): string {
  return t(getChannelTypeLabelKey(channel.type) as never);
}

export function BackendNotificationChannelsSection() {
  const { t } = useI18n();
  const {
    channels,
    isLoading,
    isSaving,
    isTesting,
    error,
    setChannels,
    saveChannels,
    testChannel,
    addChannel,
    removeChannel,
  } = useBackendNotificationChannels();
  const [testMessage, setTestMessage] = useState(
    t("notificationsBackendTestDefaultMessage"),
  );
  const [saveInfo, setSaveInfo] = useState<string | null>(null);
  const [selectedChannelType, setSelectedChannelType] =
    useState<BackendNotificationChannel["type"]>("telegram");

  const updateName = (channelId: string, name: string) => {
    setChannels(
      updateChannel(channels, channelId, (channel) => ({
        ...channel,
        name,
      })),
    );
    setSaveInfo(null);
  };

  const updateEnabled = (channelId: string, enabled: boolean) => {
    setChannels(
      updateChannel(channels, channelId, (channel) => ({
        ...channel,
        enabled,
      })),
    );
    setSaveInfo(null);
  };

  const updateEventType = (
    channelId: string,
    key: "toolApproval" | "userQuestion" | "sessionHalted",
    value: boolean,
  ) => {
    setChannels(
      updateChannel(channels, channelId, (channel) => ({
        ...channel,
        eventTypes: {
          ...channel.eventTypes,
          [key]: value,
        },
      })),
    );
    setSaveInfo(null);
  };

  const updateConfigField = (
    channelId: string,
    field: string,
    value: string,
  ) => {
    setChannels(
      updateChannel(channels, channelId, (channel) => {
        const current = channel.config as unknown as Record<string, unknown>;
        const nextValue =
          field === "port" || field === "agentId"
            ? Number(value)
            : field === "userId" || field === "groupId"
              ? value
                ? Number(value)
                : undefined
              : field === "priority"
                ? Number(value)
                : field === "tags"
                  ? value
                      .split(",")
                      .map((tag) => tag.trim())
                      .filter(Boolean)
                  : value;

        return {
          ...channel,
          config: {
            ...current,
            [field]: nextValue,
          },
        } as unknown as BackendNotificationChannel;
      }),
    );
    setSaveInfo(null);
  };

  const handleSave = async () => {
    try {
      await saveChannels();
      setSaveInfo(t("notificationsBackendSaved"));
    } catch {
      setSaveInfo(t("notificationsBackendSaveFailed"));
    }
  };

  const handleTest = async (channelId: string) => {
    const ok = await testChannel(channelId, testMessage.trim() || undefined);
    setSaveInfo(
      ok
        ? t("notificationsBackendTestSent")
        : t("notificationsBackendTestFailed"),
    );
  };

  return (
    <section className="settings-section">
      <h2>{t("notificationsBackendTitle")}</h2>
      <p className="settings-section-description">
        {t("notificationsBackendDescription")}
      </p>

      <div className="settings-group">
        <div className="settings-item backend-channels-actions-row">
          <div className="settings-item-info">
            <strong>{t("notificationsBackendAddChannelTitle")}</strong>
            <p>{t("notificationsBackendAddChannelDescription")}</p>
          </div>
          <div className="settings-item-actions backend-channels-actions">
            <div className="backend-channels-add-inline">
              <select
                className="backend-channel-input backend-channel-select-compact"
                value={selectedChannelType}
                onChange={(e) =>
                  setSelectedChannelType(
                    e.target.value as BackendNotificationChannel["type"],
                  )
                }
                disabled={isLoading || isSaving}
                aria-label={t("notificationsBackendSelectChannel")}
              >
                {CHANNEL_TYPE_ORDER.map((type) => (
                  <option key={type} value={type}>
                    {t(getChannelTypeLabelKey(type) as never)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="settings-button"
                onClick={() => addChannel(selectedChannelType)}
                disabled={isLoading || isSaving}
              >
                {t("notificationsBackendAddSelected")}
              </button>
            </div>
            <button
              type="button"
              className="settings-button"
              onClick={() => void handleSave()}
              disabled={isLoading || isSaving}
            >
              {isSaving
                ? t("notificationsBackendSaving")
                : t("notificationsBackendSaveChannels")}
            </button>
          </div>
        </div>

        {saveInfo && <p className="settings-hint">{saveInfo}</p>}
        {error && <p className="settings-error">{error}</p>}

        {isLoading ? (
          <p className="settings-loading">{t("notificationsBackendLoading")}</p>
        ) : channels.length === 0 ? (
          <p className="settings-empty">{t("notificationsBackendEmpty")}</p>
        ) : (
          <div className="backend-channel-list">
            {channels.map((channel) => (
              <div key={channel.id} className="backend-channel-card">
                <div className="backend-channel-header">
                  <div className="backend-channel-header-main">
                    <strong>{getChannelTypeLabel(channel, t as never)}</strong>
                    <span className="settings-hint">
                      {t("notificationsBackendId", { id: channel.id })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="settings-button settings-button-danger-subtle"
                    onClick={() => removeChannel(channel.id)}
                    disabled={isSaving}
                  >
                    {t("notificationsRemove")}
                  </button>
                </div>

                <div className="backend-channel-form-grid">
                  <label className="backend-field">
                    <span>{t("notificationsBackendName")}</span>
                    <input
                      className="backend-channel-input"
                      value={channel.name}
                      onChange={(e) => updateName(channel.id, e.target.value)}
                      placeholder={t("notificationsBackendNamePlaceholder")}
                      disabled={isSaving}
                    />
                  </label>
                  <label className="backend-field backend-toggle">
                    <span>{t("notificationsBackendEnabled")}</span>
                    <div className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={channel.enabled}
                        onChange={(e) =>
                          updateEnabled(channel.id, e.target.checked)
                        }
                        disabled={isSaving}
                      />
                      <span className="toggle-slider" />
                    </div>
                  </label>
                </div>

                <BackendNotificationChannelFields
                  channel={channel}
                  disabled={isSaving}
                  onChange={updateConfigField}
                />

                <div className="backend-events-grid">
                  <label className="backend-event-item">
                    <input
                      type="checkbox"
                      checked={channel.eventTypes.toolApproval}
                      onChange={(e) =>
                        updateEventType(
                          channel.id,
                          "toolApproval",
                          e.target.checked,
                        )
                      }
                      disabled={isSaving}
                    />
                    <span>{t("notificationsToolApprovalsTitle")}</span>
                  </label>
                  <label className="backend-event-item">
                    <input
                      type="checkbox"
                      checked={channel.eventTypes.userQuestion}
                      onChange={(e) =>
                        updateEventType(
                          channel.id,
                          "userQuestion",
                          e.target.checked,
                        )
                      }
                      disabled={isSaving}
                    />
                    <span>{t("notificationsQuestionsTitle")}</span>
                  </label>
                  <label className="backend-event-item">
                    <input
                      type="checkbox"
                      checked={channel.eventTypes.sessionHalted}
                      onChange={(e) =>
                        updateEventType(
                          channel.id,
                          "sessionHalted",
                          e.target.checked,
                        )
                      }
                      disabled={isSaving}
                    />
                    <span>{t("notificationsSessionHaltedTitle")}</span>
                  </label>
                </div>

                <div className="backend-test-row">
                  <input
                    className="backend-channel-input"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder={t(
                      "notificationsBackendTestMessagePlaceholder",
                    )}
                    disabled={isSaving || isTesting}
                  />
                  <button
                    type="button"
                    className="settings-button"
                    onClick={() => void handleTest(channel.id)}
                    disabled={isSaving || isTesting}
                  >
                    {isTesting
                      ? t("notificationsBackendTesting")
                      : t("notificationsBackendSendTest")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
