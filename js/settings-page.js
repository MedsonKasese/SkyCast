import { applyTheme, getSettings, saveSettings } from "./settings.js";

const form = document.getElementById("settings-form");
const status = document.getElementById("settings-status");

applyTheme();

const settings = getSettings();
form.elements.theme.value = settings.theme;
form.querySelectorAll("input[name='sportsUpdates']").forEach((input) => {
  input.checked = settings.sportsUpdates.includes(input.value);
});

form.elements.theme.addEventListener("change", (event) => {
  applyTheme(event.target.value);
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const sportsUpdates = formData.getAll("sportsUpdates");

  saveSettings({ theme: formData.get("theme"), sportsUpdates });
  status.textContent = "Settings saved. Your sports feed and alerts now match your choices.";
});
