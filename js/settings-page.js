import { applyTheme, getSettings, saveSettings } from "./settings.js";
import { removeDisabledSportsNotifications } from "./notifications.js";

const form = document.getElementById("settings-form");
const status = document.getElementById("settings-status");

applyTheme();

const settings = getSettings();
form.elements.theme.value = settings.theme;
form.elements.units.value = settings.units;
form.elements.alertTiming.value = settings.alertTiming;
form.elements.favoriteTeams.value = settings.favoriteTeams.join(", ");

form.querySelectorAll("input[name='sportsUpdates']").forEach((input) => {
  input.checked = settings.sportsUpdates.includes(input.value);
});

// A radio group is a RadioNodeList, not an individual input. Attach the
// change listener to each radio so initialization continues and the Save
// settings submit handler is registered.
form.querySelectorAll("input[name='theme']").forEach((input) => {
  input.addEventListener("change", (event) => {
    applyTheme(event.target.value);
    status.textContent = "Theme preview updated. Save settings to keep this choice.";
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const sportsUpdates = formData.getAll("sportsUpdates");
  const favoriteTeams = [
    ...new Map(
      String(formData.get("favoriteTeams") || "")
        .split(",")
        .map((team) => team.trim())
        .filter(Boolean)
        .map((team) => [team.toLocaleLowerCase(), team]),
    ).values(),
  ];
  const nextSettings = {
    theme: formData.get("theme"),
    units: formData.get("units"),
    alertTiming: formData.get("alertTiming"),
    sportsUpdates,
    favoriteTeams,
  };

  const saved = saveSettings(nextSettings);

  if (!saved) {
    status.textContent = "Unable to save settings. Please try again.";
    return;
  }

  const notificationsUpdated =
    removeDisabledSportsNotifications(sportsUpdates, favoriteTeams, nextSettings.alertTiming);

  status.textContent = notificationsUpdated
    ? "Settings saved. Your preferences and sports alerts are updated."
    : "Settings saved, but existing alerts could not be updated.";
});
