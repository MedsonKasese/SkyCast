import {
  applyTheme,
  DEFAULT_SETTINGS,
  getSettings,
  normalizeSettings,
  saveSettings,
} from "./settings.js";
import { removeDisabledSportsNotifications } from "./notifications.js";

const form = document.getElementById("settings-form");
const status = document.getElementById("settings-status");
const saveButton = document.getElementById("settings-save");
const sportsCount = document.getElementById("sports-count");
const sportsInputs = [...form.querySelectorAll("input[name='sportsUpdates']")];

function readFormSettings() {
  return normalizeSettings({
    theme: form.elements.theme.value,
    units: form.elements.units.value,
    sportsUpdates: sportsInputs
      .filter((input) => input.checked)
      .map((input) => input.value),
    favoriteTeams: String(form.elements.favoriteTeams.value || "").split(","),
  });
}

function settingsKey(settings) {
  return JSON.stringify(normalizeSettings(settings));
}

const savedSettings = getSettings();
let savedSnapshot = settingsKey(savedSettings);

function updateFormState(message) {
  const currentSettings = readFormSettings();
  const isDirty = settingsKey(currentSettings) !== savedSnapshot;
  saveButton.disabled = !isDirty;
  form.classList.toggle("is-dirty", isDirty);
  sportsCount.textContent = `${currentSettings.sportsUpdates.length} of ${sportsInputs.length} selected`;

  if (message) {
    status.textContent = message;
  } else if (isDirty) {
    status.textContent =
      "Unsaved changes. Save settings to keep your preferences.";
  } else {
    status.textContent = "Your settings are up to date.";
  }
}

function setFormSettings(settings) {
  const normalized = normalizeSettings(settings);
  form.elements.theme.value = normalized.theme;
  form.elements.units.value = normalized.units;
  form.elements.favoriteTeams.value = normalized.favoriteTeams.join(", ");
  sportsInputs.forEach((input) => {
    input.checked = normalized.sportsUpdates.includes(input.value);
  });
  applyTheme(normalized.theme);
  updateFormState();
}

setFormSettings(savedSettings);

form.addEventListener("input", () => updateFormState());
form.addEventListener("change", (event) => {
  if (event.target.matches("input[name='theme']")) {
    applyTheme(event.target.value);
  }
  updateFormState();
});

document.getElementById("sports-select-all").addEventListener("click", () => {
  sportsInputs.forEach((input) => {
    input.checked = true;
  });
  updateFormState();
});

document.getElementById("sports-select-none").addEventListener("click", () => {
  sportsInputs.forEach((input) => {
    input.checked = false;
  });
  updateFormState();
});

document.getElementById("settings-reset").addEventListener("click", () => {
  setFormSettings(DEFAULT_SETTINGS);
  const isDirty = settingsKey(readFormSettings()) !== savedSnapshot;
  status.textContent = isDirty
    ? "Default settings loaded as a preview. Save settings to keep them."
    : "Settings already match the defaults.";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const nextSettings = readFormSettings();
  const saved = saveSettings(nextSettings);

  if (!saved) {
    updateFormState(
      "Unable to save settings. Your changes are still here; check storage and try again.",
    );
    return;
  }

  savedSnapshot = settingsKey(nextSettings);
  let notificationsUpdated = true;
  try {
    notificationsUpdated = removeDisabledSportsNotifications(
      nextSettings.sportsUpdates,
      nextSettings.favoriteTeams,
    );
  } catch {
    notificationsUpdated = false;
  }

  updateFormState(
    notificationsUpdated
      ? "Settings saved. Your preferences and sports alerts are updated."
      : "Settings saved, but existing alerts could not be updated.",
  );
});
