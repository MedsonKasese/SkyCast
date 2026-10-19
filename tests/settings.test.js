import test from "node:test";
import assert from "node:assert/strict";
import { app } from "./helpers.js";

const SETTINGS_KEY = "skycast-settings";
const DEFAULT_SPORTS = [
  "football",
  "cricket",
  "golf",
  "basketball",
  "american-football",
  "baseball",
  "ice-hockey",
];
const submit = (harness) =>
  harness.document
    .getElementById("settings-form")
    .dispatchEvent(
      new harness.window.Event("submit", { bubbles: true, cancelable: true }),
    );
const change = (harness, selector) =>
  harness.document
    .querySelector(selector)
    .dispatchEvent(new harness.window.Event("change", { bubbles: true }));

test("loads normalized saved preferences and starts with a clean disabled Save button", async (t) => {
  const storedSettings = {
    theme: "dark",
    units: "f",
    sportsUpdates: ["football", "unknown", "football"],
    favoriteTeams: [" Arsenal ", "arsenal", "", 42],
  };
  const harness = app({
    page: "settings.html",
    stored: { [SETTINGS_KEY]: JSON.stringify(storedSettings) },
  });
  t.after(harness.close);
  await harness.load("js/settings-page.js");

  assert.equal(harness.document.documentElement.dataset.theme, "dark");
  assert.equal(harness.document.getElementById("units-f").checked, true);
  assert.deepEqual(
    [
      ...harness.document.querySelectorAll(
        "input[name='sportsUpdates']:checked",
      ),
    ].map((input) => input.value),
    ["football"],
  );
  assert.equal(
    harness.document.getElementById("favorite-teams").value,
    "Arsenal",
  );
  assert.equal(harness.document.getElementById("settings-save").disabled, true);
  assert.match(
    harness.document.getElementById("settings-status").textContent,
    /up to date/i,
  );
});

test("changes preview live and track every field until saved", async (t) => {
  const harness = app({ page: "settings.html" });
  t.after(harness.close);
  await harness.load("js/settings-page.js");

  const theme = harness.document.getElementById("theme-light");
  theme.checked = true;
  change(harness, "#theme-light");
  assert.equal(harness.document.documentElement.dataset.theme, "light");
  assert.equal(
    harness.window.localStorage.getItem(SETTINGS_KEY),
    null,
    "preview does not persist preferences",
  );
  assert.equal(
    harness.document.getElementById("settings-save").disabled,
    false,
  );

  harness.document.getElementById("units-f").checked = true;
  change(harness, "#units-f");
  harness.document.getElementById("favorite-teams").value =
    "Arsenal, Arsenal, Manchester United";
  harness.document
    .getElementById("favorite-teams")
    .dispatchEvent(new harness.window.Event("input", { bubbles: true }));
  assert.match(
    harness.document.getElementById("settings-status").textContent,
    /unsaved changes/i,
  );

  harness.document.getElementById("sports-select-none").click();
  assert.equal(
    harness.document.getElementById("sports-count").textContent,
    "0 of 7 selected",
  );
  assert.equal(
    harness.document.getElementById("settings-save").disabled,
    false,
  );
  harness.document.getElementById("sports-select-all").click();
  assert.equal(
    harness.document.getElementById("sports-count").textContent,
    "7 of 7 selected",
  );

  submit(harness);
  const saved = JSON.parse(harness.window.localStorage.getItem(SETTINGS_KEY));
  assert.deepEqual(saved, {
    theme: "light",
    units: "f",
    sportsUpdates: DEFAULT_SPORTS,
    favoriteTeams: ["Arsenal", "Manchester United"],
  });
  assert.equal(harness.document.getElementById("settings-save").disabled, true);
  assert.match(
    harness.document.getElementById("settings-status").textContent,
    /settings saved/i,
  );
});

test("reset restores defaults as a preview and does not save until submitted", async (t) => {
  const initial = {
    theme: "dark",
    units: "f",
    sportsUpdates: ["golf"],
    favoriteTeams: ["Lakers"],
  };
  const harness = app({
    page: "settings.html",
    stored: { [SETTINGS_KEY]: JSON.stringify(initial) },
  });
  t.after(harness.close);
  await harness.load("js/settings-page.js");

  harness.document.getElementById("settings-reset").click();
  assert.equal(harness.document.getElementById("theme-system").checked, true);
  assert.equal(harness.document.getElementById("units-c").checked, true);
  assert.equal(harness.document.getElementById("favorite-teams").value, "");
  assert.deepEqual(
    [
      ...harness.document.querySelectorAll(
        "input[name='sportsUpdates']:checked",
      ),
    ].map((input) => input.value),
    DEFAULT_SPORTS,
  );
  assert.notEqual(
    harness.document.documentElement.dataset.theme,
    "light",
    "system preview follows the test device's dark preference",
  );
  assert.deepEqual(
    JSON.parse(harness.window.localStorage.getItem(SETTINGS_KEY)),
    initial,
  );
  assert.equal(
    harness.document.getElementById("settings-save").disabled,
    false,
  );
  assert.match(
    harness.document.getElementById("settings-status").textContent,
    /preview/i,
  );
});

test("OS theme changes respect the active in-session preview choice", async (t) => {
  const harness = app({
    page: "settings.html",
    stored: { [SETTINGS_KEY]: JSON.stringify({ theme: "system" }) },
  });
  t.after(harness.close);
  let mediaChange;
  const media = {
    matches: false,
    addEventListener(type, listener) {
      if (type === "change") mediaChange = listener;
    },
  };
  harness.window.matchMedia = () => media;
  await harness.load("js/settings-page.js");
  assert.equal(harness.document.documentElement.dataset.theme, "dark");

  harness.document.getElementById("theme-light").checked = true;
  change(harness, "#theme-light");
  media.matches = false;
  mediaChange({ matches: false });
  assert.equal(
    harness.document.documentElement.dataset.theme,
    "light",
    "OS change must not override explicit preview",
  );

  harness.document.getElementById("theme-system").checked = true;
  change(harness, "#theme-system");
  media.matches = true;
  mediaChange({ matches: true });
  assert.equal(
    harness.document.documentElement.dataset.theme,
    "light",
    "system preview follows the current OS setting",
  );
  assert.equal(
    JSON.parse(harness.window.localStorage.getItem(SETTINGS_KEY)).theme,
    "system",
    "preview remains unsaved",
  );
});

test("reports storage failures without discarding the user's edits", async (t) => {
  const harness = app({ page: "settings.html", storageBlocked: true });
  t.after(harness.close);
  await harness.load("js/settings-page.js");

  harness.document.getElementById("favorite-teams").value = "Arsenal";
  harness.document
    .getElementById("favorite-teams")
    .dispatchEvent(new harness.window.Event("input", { bubbles: true }));
  submit(harness);

  assert.equal(
    harness.document.getElementById("favorite-teams").value,
    "Arsenal",
  );
  assert.equal(
    harness.document.getElementById("settings-save").disabled,
    false,
  );
  assert.match(
    harness.document.getElementById("settings-status").textContent,
    /unable to save/i,
  );
});
