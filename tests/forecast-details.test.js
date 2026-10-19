import test from "node:test";
import assert from "node:assert/strict";
import { app, response, weather, tick } from "./helpers.js";

function detailApp({ data = weather(), date = "2026-10-21", query = "-11.46,34.02", stored = {}, fetch } = {}) {
  const h = app({ page: "forecast.html", stored, fetch: fetch || (async () => response(data)) });
  h.window.history.replaceState(null, "", `forecast.html?${new URLSearchParams({ q: query, date })}`);
  return h;
}

test("today scrolls to the top, later days link to their specific forecast dates", async () => {
  const h = app();
  const ui = await h.load("js/ui.js");
  let scroll;
  h.window.scrollTo = (options) => { scroll = options; };
  ui.displayForecast(weather());
  const cards = [...h.document.querySelectorAll("#forecast-container .forecast-action")];
  assert.equal(cards.length, 3);
  assert.equal(cards[0].tagName, "BUTTON");
  cards[0].click();
  assert.equal(scroll.top, 0);
  assert.equal(h.document.activeElement.id, "city-name");
  for (let index = 1; index < 3; index++) {
    const url = new URL(cards[index].href);
    assert.equal(url.pathname, "/forecast.html");
    assert.equal(url.searchParams.get("date"), `2026-10-${20 + index}`);
    assert.equal(url.searchParams.get("q"), "-11.46,34.02");
  }
  h.window.matchMedia = () => ({ matches: true });
  cards[0].click();
  assert.equal(scroll.behavior, "instant");
  h.close();
});

test("today is determined by the location's calendar date, not the viewer's clock or array position", async () => {
  const h = app();
  const ui = await h.load("js/ui.js");
  const data = weather();
  data.location.localtime = "2026-10-21 00:01";
  ui.displayForecast(data);
  assert.equal(h.document.querySelectorAll("#forecast-container button").length, 1);
  assert.match(h.document.querySelector("#forecast-container button").textContent, /Today/);
  h.close();
});

test("second and third day details use the selected day, show amounts, and follow unit settings", async () => {
  for (const units of ["c", "f"]) {
    for (const date of ["2026-10-21", "2026-10-22"]) {
      const data = weather();
      const selected = data.forecast.forecastday.find((day) => day.date === date);
      selected.day = { ...selected.day, maxtemp_c: 38, maxtemp_f: 100.4, maxwind_kph: 64, maxwind_mph: 39.8, totalprecip_mm: 12.5, daily_chance_of_rain: 85 };
      const h = detailApp({ data, date, stored: { "skycast-settings": JSON.stringify({ units }) } });
      await h.load("js/forecast-page.js");
      await tick();
      const content = h.document.getElementById("forecast-details");
      assert.match(h.document.title, new RegExp(date));
      assert.match(content.textContent, units === "f" ? /100.4°F/ : /38°C/);
      assert.match(content.textContent, units === "f" ? /39.8 mph/ : /64 km\/h/);
      assert.match(content.textContent, /85%/);
      assert.match(content.textContent, units === "f" ? /0.49 in/ : /12.5 mm/);
      assert.equal(content.querySelectorAll(".forecast-hour-row").length, 24);
      assert.equal(content.getAttribute("aria-busy"), "false");
      assert.equal(content.hasAttribute("inert"), false);
      assert.equal(h.document.querySelector('[aria-current="page"]').textContent, date);
      h.close();
    }
  }
});

test("detail renderer safely escapes provider text and handles missing measurements", async () => {
  const data = weather('<img src=x onerror="alert(1)">');
  const h = detailApp({ data });
  await h.load("js/forecast-page.js");
  await tick();
  assert.equal(h.document.querySelectorAll("[onerror]").length, 0);
  assert.match(h.document.getElementById("forecast-details").textContent, /Unavailable/);
  assert.doesNotMatch(h.document.getElementById("forecast-details").textContent, /NaN|undefined/);
  h.close();
});

test("offline detail view only uses cache matching both the location and requested day", async () => {
  for (const query of ["-11.46,34.02", "Elsewhere"]) {
    const h = detailApp({ query, stored: { "skycast-cached-weather": JSON.stringify(weather()) } });
    h.window.fetch = async () => { throw new h.window.TypeError("Offline"); };
    await h.load("js/forecast-page.js");
    await tick();
    assert.match(h.document.getElementById("forecast-status").textContent, query === "Elsewhere" ? /Unable to load/ : /offline.*saved forecast/i);
    assert.equal(h.document.querySelectorAll(".forecast-hour-row").length, query === "Elsewhere" ? 0 : 24);
    h.close();
  }
});

test("invalid or expired date links show an actionable unavailable state and release loading", async () => {
  for (const date of ["bad", "2020-01-01"]) {
    const h = detailApp({ date });
    await h.load("js/forecast-page.js");
    await tick();
    assert.equal(h.document.getElementById("forecast-title").textContent, "Forecast unavailable");
    assert.match(h.document.getElementById("forecast-status").textContent, /Choose a day|no longer/);
    assert.equal(h.document.querySelectorAll("[inert], .sky-is-loading").length, 0);
    h.close();
  }
});

test("expected-weather notification shows its amount and an accessible detail action", async () => {
  const data = weather();
  data.forecast.forecastday[1].day = { ...data.forecast.forecastday[1].day, maxtemp_c: 38, maxtemp_f: 100.4 };
  const h = app({
    stored: { "skycast-settings": JSON.stringify({ units: "f" }) },
    fetch: async (url) => response(String(url).startsWith("/api/weather") ? data : {}),
  });
  await h.load("js/main.js");
  await tick();
  h.document.getElementById("notification-button").click();
  const item = [...h.document.querySelectorAll(".notification-item")].find((node) => node.textContent.includes("High Temperature Expected"));
  assert.ok(item);
  assert.equal(item.tagName, "BUTTON");
  assert.match(item.textContent, /100°F/);
  assert.match(item.textContent, /2026-10-21/);
  assert.match(item.textContent, /View forecast details/);
  const destination = new URL(item.dataset.forecastUrl, "https://skycast.test/");
  assert.equal(destination.searchParams.get("q"), "-11.46,34.02");
  assert.equal(destination.searchParams.get("date"), "2026-10-21");
  h.close();
});

test("notification links retain their own coordinates across location changes and support expired-day feedback", async () => {
  const h = app();
  const { notificationForecastUrl } = await h.load("js/forecast-details.js");
  for (const locationQuery of ["-11.46,34.02", "40.71,-74.01"]) {
    const url = new URL(notificationForecastUrl({ location: "Same city name", locationQuery, forecastDate: "2020-01-01" }), "https://skycast.test/");
    assert.equal(url.searchParams.get("q"), locationQuery);
    assert.equal(url.searchParams.get("date"), "2020-01-01");
  }
  assert.equal(notificationForecastUrl({ forecastDate: "invalid", location: "Mzuzu" }), null);
  const legacy = new URL(notificationForecastUrl({ location: "Mzuzu", forecastDate: "2026-10-21" }), "https://skycast.test/");
  assert.equal(legacy.searchParams.get("q"), "Mzuzu");
  const ui = await h.load("js/ui.js");
  ui.displayForecast(weather());
  const today = h.document.querySelector("#forecast-container button");
  assert.match(today.getAttribute("aria-label"), /high 25°C, low 15°C, Sunny, 10% chance of rain/);
  assert.equal(today.querySelectorAll("div").length, 0);
  h.close();
});
