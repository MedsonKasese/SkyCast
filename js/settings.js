export const SETTINGS_KEY = "skycast-settings";

const defaultSettings = {
  theme: "system",
  units: "c",
  alertTiming: "24h",
  sportsUpdates: [
    "football",
    "cricket",
    "golf",
    "basketball",
    "american-football",
    "baseball",
    "ice-hockey",
  ],
  favoriteTeams: [],
};

let systemThemeListenerAttached = false;

/**
 * Read saved preferences, filling missing fields from the defaults.
 * Invalid or unsupported values are replaced with their defaults.
 * @returns {{theme: string, units: string, alertTiming: string, sportsUpdates: string[], favoriteTeams: string[]}}
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
      alertTiming: ["15m", "1h", "6h", "24h"].includes(stored.alertTiming)
        ? stored.alertTiming
        : defaultSettings.alertTiming,
      sportsUpdates: Array.isArray(stored.sportsUpdates)
        ? stored.sportsUpdates
        : defaultSettings.sportsUpdates,
      favoriteTeams: Array.isArray(stored.favoriteTeams)
        ? stored.favoriteTeams.filter((team) => typeof team === "string")
        : defaultSettings.favoriteTeams,
    };
  } catch {
    return { ...defaultSettings };
  }
}

/**
 * Persist the complete settings object and apply the selected theme.
 * @param {{theme: string, units: string, alertTiming?: string, sportsUpdates: string[], favoriteTeams?: string[]}} settings
 * @returns {boolean} True when the settings were persisted successfully.
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
 * Apply the selected application theme. System mode also listens for future
 * OS theme changes so the app follows the device automatically.
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
