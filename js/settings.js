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

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  applyTheme(settings.theme);
}

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
