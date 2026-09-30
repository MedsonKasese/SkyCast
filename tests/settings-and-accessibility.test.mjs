import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getSettings, saveSettings, SETTINGS_KEY } from "../js/settings.js";

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};
globalThis.document = { documentElement: { dataset: {}, style: {} } };
globalThis.window = {
  matchMedia: () => ({ matches: false, addEventListener() {} }),
};

test("settings defaults preserve the existing 24-hour alert behavior", () => {
  store.clear();
  const settings = getSettings();
  assert.equal(settings.alertTiming, "24h");
  assert.equal(settings.units, "c");
  assert.deepEqual(settings.favoriteTeams, []);
});

test("settings persist alert timing, units, theme, sports, and favorites", () => {
  const settings = {
    theme: "light",
    units: "f",
    alertTiming: "1h",
    sportsUpdates: ["football"],
    favoriteTeams: ["Arsenal"],
  };
  assert.equal(saveSettings(settings), true);
  assert.equal(JSON.parse(localStorage.getItem(SETTINGS_KEY)).alertTiming, "1h");
  assert.equal(getSettings().units, "f");
  assert.deepEqual(getSettings().favoriteTeams, ["Arsenal"]);
  assert.equal(document.documentElement.dataset.theme, "light");
});

test("unsupported stored timing falls back to 24 hours", () => {
  store.set(SETTINGS_KEY, JSON.stringify({ alertTiming: "3days" }));
  assert.equal(getSettings().alertTiming, "24h");
});

test("settings expose labeled alert timing and live connectivity status", async () => {
  const html = await readFile(new URL("../settings.html", import.meta.url), "utf8");
  const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../css/components.css", import.meta.url), "utf8");
  const base = await readFile(new URL("../css/base.css", import.meta.url), "utf8");
  assert.match(html, /label class="settings-choice" for="alert-timing"/);
  assert.match(html, /value="15m"/);
  assert.match(html, /value="1h"/);
  assert.match(html, /value="6h"/);
  assert.match(html, /value="24h"/);
  assert.match(index, /id="connection-status"[^>]*role="status"[^>]*aria-live="polite"/);
  assert.match(base, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /connection-status\[data-state="offline"\]/);
});

test("service worker uses offline navigation fallback and never substitutes HTML for API JSON", async () => {
  const sw = await readFile(new URL("../sw.js", import.meta.url), "utf8");
  assert.match(sw, /request\.mode === "navigate"/);
  assert.match(sw, /caches\.match\("\/index\.html"\)/);
  assert.match(sw, /pathname\.startsWith\("\/api\/"\)/);
  assert.match(sw, /const CACHE = "skycast-v8"/);
});
