import type { BackendNotificationChannel } from "../api/client";
import { useI18n } from "../i18n";
import { CHANNEL_DEFINITIONS } from "./backendNotificationChannelConfig";

interface Props {
  channel: BackendNotificationChannel;
  disabled: boolean;
  onChange: (channelId: string, key: string, value: string) => void;
}

function getFieldValue(
  channel: BackendNotificationChannel,
  key: string,
): string {
  const raw = (channel.config as unknown as Record<string, unknown>)[key];
  if (Array.isArray(raw)) {
    return raw.join(", ");
  }
  if (raw === undefined || raw === null) {
    return "";
  }
  return String(raw);
}

export function BackendNotificationChannelFields({
  channel,
  disabled,
  onChange,
}: Props) {
  const { t } = useI18n();
  const definition = CHANNEL_DEFINITIONS[channel.type];

  return (
    <div className="backend-channel-form-grid">
      {definition.fields
        .filter((field) => !field.visibleWhen || field.visibleWhen(channel))
        .map((field) => (
          <label
            key={field.key}
            className="backend-field"
            htmlFor={`${channel.id}-${field.key}`}
          >
            <span>{t(field.labelKey as never)}</span>
            {field.input === "select" ? (
              <select
                id={`${channel.id}-${field.key}`}
                className="backend-channel-input"
                value={getFieldValue(channel, field.key)}
                onChange={(e) =>
                  onChange(channel.id, field.key, e.target.value)
                }
                disabled={disabled}
              >
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`${channel.id}-${field.key}`}
                type={field.input}
                className="backend-channel-input"
                value={getFieldValue(channel, field.key)}
                onChange={(e) =>
                  onChange(channel.id, field.key, e.target.value)
                }
                placeholder={
                  field.placeholderKey
                    ? t(field.placeholderKey as never)
                    : undefined
                }
                disabled={disabled}
              />
            )}
          </label>
        ))}
    </div>
  );
}
