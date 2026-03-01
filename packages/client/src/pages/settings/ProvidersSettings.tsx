import { useCallback, useEffect, useState } from "react";
import { useProviders } from "../../hooks/useProviders";
import { useServerSettings } from "../../hooks/useServerSettings";
import { getAllProviders } from "../../providers/registry";

function OllamaUrlInput() {
  const { settings, updateSetting } = useServerSettings();
  const [url, setUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const serverValue = settings?.ollamaUrl ?? "";

  useEffect(() => {
    if (settings) {
      setUrl(settings.ollamaUrl ?? "");
    }
  }, [settings]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateSetting("ollamaUrl", url.trim() || undefined);
      setHasChanges(false);
    } catch {
      // Error handled by useServerSettings
    } finally {
      setIsSaving(false);
    }
  }, [url, updateSetting]);

  return (
    <div style={{ marginTop: "var(--space-2)", width: "100%" }}>
      <div
        style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}
      >
        <input
          type="text"
          className="settings-input"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setHasChanges(e.target.value !== serverValue);
          }}
          placeholder="http://localhost:11434"
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="settings-button"
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
      </div>
      <span className="settings-hint">
        Ollama server URL. Default: http://localhost:11434
      </span>
    </div>
  );
}

export function ProvidersSettings() {
  const { providers: serverProviders, loading: providersLoading } =
    useProviders();

  // Merge server detection status with client-side metadata
  const registeredProviders = getAllProviders();
  const providerDisplayList = registeredProviders.map((clientProvider) => {
    const serverInfo = serverProviders.find(
      (p) => p.name === clientProvider.id,
    );
    return {
      ...clientProvider,
      installed: serverInfo?.installed ?? false,
      authenticated: serverInfo?.authenticated ?? false,
    };
  });

  return (
    <section className="settings-section">
      <h2>Providers</h2>
      <p className="settings-section-description">
        AI providers are auto-detected when their CLI is installed.
      </p>
      <div className="settings-group">
        {providerDisplayList.map((provider) => (
          <div key={provider.id} className="settings-item">
            <div className="settings-item-info">
              <div className="settings-item-header">
                <strong>{provider.displayName}</strong>
                {provider.installed ? (
                  <span className="settings-status-badge settings-status-detected">
                    Detected
                  </span>
                ) : (
                  <span className="settings-status-badge settings-status-not-detected">
                    Not Detected
                  </span>
                )}
              </div>
              <p>{provider.metadata.description}</p>
              {provider.metadata.limitations.length > 0 && (
                <ul className="settings-limitations">
                  {provider.metadata.limitations.map((limitation) => (
                    <li key={limitation}>{limitation}</li>
                  ))}
                </ul>
              )}
              {provider.id === "claude-ollama" && <OllamaUrlInput />}
            </div>
            {provider.metadata.website && (
              <a
                href={provider.metadata.website}
                target="_blank"
                rel="noopener noreferrer"
                className="settings-link"
              >
                Website
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
