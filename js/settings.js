export const SETTINGS_KEY = "skycast-settings";

const defaultSettings = {
  theme: "system",
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

/**
 * Read saved preferences, filling missing fields from the defaults.
 * Unreadable storage or invalid JSON falls back to the default settings.
 * @returns {{theme: string, sportsUpdates: string[]}} Theme and enabled sport keys.
 */
export function getSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    return {
      ...defaultSettings,
      ...(stored || {}),
      sportsUpdates: Array.isArray(stored?.sportsUpdates)
        ? stored.sportsUpdates
        : defaultSettings.sportsUpdates,
    };
  } catch {
    return defaultSettings;
  }
}

/**
 * Replace the stored preferences and immediately apply the selected theme.
 * @param {{theme: string, sportsUpdates: string[]}} settings - Preferences to persist.
 * @returns {void}
 * @throws {Error} If serialization or writing to local storage fails.
 */
export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyTheme(settings.theme);
}

/**
 * Set the document theme and color scheme, resolving system preference once.
 * @param {string} [theme=getSettings().theme] - light, dark, or system; defaults to the saved theme.
 * @returns {void}
 */
export function applyTheme(theme = getSettings().theme) {
  const root = document.documentElement;
  const resolvedTheme = theme === "system"
    ? window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark"
    : theme;

  root.dataset.theme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;
}
