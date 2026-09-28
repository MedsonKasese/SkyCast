export const SETTINGS_KEY = "skycast-settings";

const defaultSettings = {
  theme: "system",
  units: "c",
  sportsUpdates: [
    "football",
    "cricket",
    "golf",
    "basketball",
    "american-football",
    "baseball",
    "ice-hockey",
  ],
};

let systemThemeListenerAttached = false;

/**
 * Read saved preferences, filling missing fields from the defaults.
 * Unsupported themes and units, and non-array sportsUpdates, use defaults;
 * entries in a saved sportsUpdates array are not validated.
 * Storage or JSON parsing failures return the defaults.
 * @returns {{theme: string, units: string, sportsUpdates: string[]}}
 */
export function getSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};

    return {
      ...defaultSettings,
      ...stored,
      theme: ["system", "light", "dark"].includes(stored.theme)
        ? stored.theme
        : defaultSettings.theme,
      units: ["c", "f"].includes(stored.units)
        ? stored.units
        : defaultSettings.units,
      sportsUpdates: Array.isArray(stored.sportsUpdates)
        ? stored.sportsUpdates
        : defaultSettings.sportsUpdates,
    };
  } catch {
    return { ...defaultSettings };
  }
}

/**
 * Persist the complete settings object and apply the selected theme.
 * Serialization, storage, and theme application errors return false.
 * A theme application failure does not undo the saved preferences.
 * @param {{theme: string, units: string, sportsUpdates: string[]}} settings
 * @returns {boolean} True when both persistence and theme application succeed.
 */
export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    applyTheme(settings.theme);
    return true;
  } catch (error) {
    console.error("Failed to save settings:", error);
    return false;
  }
}

/**
 * Apply the selected application theme without saving the preference.
 * System mode resolves the current OS theme; future OS theme changes are
 * applied only while the saved theme preference is system.
 * @param {"system"|"light"|"dark"} [theme=getSettings().theme]
 * @returns {void}
 */
export function applyTheme(theme = getSettings().theme) {
  const root = document.documentElement;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");

  const updateTheme = () => {
    const resolvedTheme =
      theme === "system"
        ? mediaQuery.matches
          ? "light"
          : "dark"
        : theme;

    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  };

  updateTheme();

  if (!systemThemeListenerAttached) {
    mediaQuery.addEventListener?.("change", () => {
      if (getSettings().theme === "system") {
        applyTheme("system");
      }
    });
    systemThemeListenerAttached = true;
  }
}
