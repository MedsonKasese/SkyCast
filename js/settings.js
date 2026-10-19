export const SETTINGS_KEY = "skycast-settings";

export const DEFAULT_SETTINGS = Object.freeze({
  theme: "system",
  units: "c",
  sportsUpdates: Object.freeze([
    "football",
    "cricket",
    "golf",
    "basketball",
    "american-football",
    "baseball",
    "ice-hockey",
  ]),
  favoriteTeams: Object.freeze([]),
});

let currentThemeChoice = null;
let systemThemeListenerAttached = false;

/** Return a clean settings object, dropping unsupported values and duplicates. */
export function normalizeSettings(settings = {}) {
  const source = settings && typeof settings === "object" ? settings : {};
  const validSports = DEFAULT_SETTINGS.sportsUpdates;
  const sportsUpdates = Array.isArray(source.sportsUpdates)
    ? [
        ...new Set(
          source.sportsUpdates.filter((sport) => validSports.includes(sport)),
        ),
      ]
    : [...validSports];
  const favoriteTeams = [];
  const seenTeams = new Set();

  if (Array.isArray(source.favoriteTeams)) {
    source.favoriteTeams.forEach((team) => {
      if (typeof team !== "string") return;
      const cleanTeam = team.trim();
      const key = cleanTeam.toLocaleLowerCase();
      if (cleanTeam && !seenTeams.has(key)) {
        favoriteTeams.push(cleanTeam);
        seenTeams.add(key);
      }
    });
  }

  return {
    theme: ["system", "light", "dark"].includes(source.theme)
      ? source.theme
      : DEFAULT_SETTINGS.theme,
    units: ["c", "f"].includes(source.units)
      ? source.units
      : DEFAULT_SETTINGS.units,
    sportsUpdates,
    favoriteTeams,
  };
}

/** Read saved preferences and fill missing or invalid values from defaults. */
export function getSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
    return normalizeSettings(stored);
  } catch {
    return normalizeSettings();
  }
}

/** Persist normalized preferences and apply the selected theme. */
export function saveSettings(settings) {
  const normalized = normalizeSettings(settings);
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized));
    applyTheme(normalized.theme);
    return true;
  } catch (error) {
    console.error("Failed to save settings:", error);
    return false;
  }
}

/**
 * Apply an explicit or saved theme. Passing a preview choice also updates the
 * in-session choice used by the OS listener, without changing persisted data.
 * @param {"system"|"light"|"dark"} [theme=getSettings().theme]
 */
export function applyTheme(theme = getSettings().theme) {
  const root = document.documentElement;
  const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
  currentThemeChoice = ["system", "light", "dark"].includes(theme)
    ? theme
    : "system";

  const updateTheme = () => {
    const resolvedTheme =
      currentThemeChoice === "system"
        ? mediaQuery.matches
          ? "light"
          : "dark"
        : currentThemeChoice;
    root.dataset.theme = resolvedTheme;
    root.style.colorScheme = resolvedTheme;
  };

  updateTheme();

  if (!systemThemeListenerAttached) {
    mediaQuery.addEventListener?.("change", updateTheme);
    systemThemeListenerAttached = true;
  }
}
