import test from "node:test";
import assert from "node:assert/strict";
import { app, deferred, response, weather, tick, search } from "./helpers.js";

const ancillary = (url) =>
  response(String(url).startsWith("/api/leagues") ? { events: [] } : {});

test("initial HTML marks every weather card and sports busy before JS runs", () => {
  const h = app();
  const cards = [...h.document.querySelectorAll("[data-weather-loading]")];
  assert.equal(cards.length, 9);
  for (const card of cards) {
    assert.equal(card.getAttribute("aria-busy"), "true");
    assert.ok(card.classList.contains("sky-is-loading"));
    assert.ok(card.hasAttribute("inert"));
  }
  assert.ok(
    h.document
      .querySelector(".sports-section")
      .classList.contains("sky-is-loading"),
  );
  h.close();
});

test("whole-card loading preserves forecast DOM, and restores inert state", async () => {
  const h = app();
  const { setWeatherSkeletons } = await h.load("js/skeletons.js");
  const container = h.document.getElementById("hourly-container");
  container.innerHTML = '<div class="forecast-card">Previous data</div>';
  const card = container.firstElementChild;
  setWeatherSkeletons(true);
  setWeatherSkeletons(true);
  assert.equal(container.firstElementChild, card);
  setWeatherSkeletons(false);
  assert.equal(container.firstElementChild, card);
  assert.equal(
    h.document.querySelectorAll("[data-weather-loading][inert]").length,
    0,
  );
  const section = h.document.querySelector("[data-weather-loading]");
  section.setAttribute("inert", "");
  setWeatherSkeletons(true);
  setWeatherSkeletons(false);
  assert.ok(section.hasAttribute("inert"));
  h.close();
});

test("successful weather survives missing Leaflet and does not await sports", async () => {
  const sports = deferred();
  const h = app({
    fetch: async (url) =>
      String(url).startsWith("/api/weather")
        ? response(weather())
        : sports.promise,
  });
  await h.load("js/main.js");
  await tick();
  assert.equal(h.document.getElementById("temperature").textContent, "22°C");
  assert.equal(
    h.document.querySelectorAll("[data-weather-loading].sky-is-loading").length,
    0,
  );
  assert.equal(
    h.document.querySelectorAll("[data-weather-loading][inert]").length,
    0,
  );
  assert.match(
    h.document.getElementById("radar-location").textContent,
    /unavailable/,
  );
  search(h, "Lilongwe");
  await tick();
  assert.equal(h.document.getElementById("search-button").disabled, false);
  assert.equal(h.window.localStorage.getItem("skycast-last-city"), "Mzuzu");
  sports.resolve(response({}));
  await tick();
  h.close();
});

test("superseded startup cannot overwrite a newer search or show offline errors", async () => {
  const first = deferred(),
    second = deferred();
  let count = 0;
  const h = app({
    fetch: (url) =>
      String(url).startsWith("/api/weather")
        ? ++count === 1
          ? first.promise
          : second.promise
        : Promise.resolve(ancillary(url)),
  });
  await h.load("js/main.js");
  search(h, "Lilongwe");
  first.reject(new h.window.DOMException("Aborted", "AbortError"));
  await tick();
  assert.ok(
    h.document
      .querySelector("[data-weather-loading]")
      .classList.contains("sky-is-loading"),
  );
  assert.equal(h.document.getElementById("error-message").textContent, "");
  second.resolve(response(weather("Lilongwe")));
  await tick();
  assert.equal(
    h.document.getElementById("city-name").textContent,
    "Lilongwe, Malawi",
  );
  assert.equal(h.window.localStorage.getItem("skycast-last-city"), "Lilongwe");
  assert.equal(
    h.document.querySelectorAll("[data-weather-loading].sky-is-loading").length,
    0,
  );
  h.close();
});

test("failed refresh retains the previous forecast rather than deleting it", async () => {
  let count = 0;
  const h = app({
    fetch: async (url) =>
      String(url).startsWith("/api/weather")
        ? ++count === 1
          ? response(weather())
          : response({ error: "Place not found" }, 400)
        : ancillary(url),
  });
  await h.load("js/main.js");
  await tick();
  const forecast = h.document.getElementById("forecast-container").innerHTML;
  search(h, "Invalid Place");
  await tick();
  assert.equal(
    h.document.getElementById("forecast-container").innerHTML,
    forecast,
  );
  assert.equal(
    h.document.querySelectorAll("[data-weather-loading].sky-is-loading").length,
    0,
  );
  assert.match(
    h.document.getElementById("error-message").textContent,
    /Place not found/,
  );
  h.close();
});

test("offline startup renders a valid cache without crashing on corrupted favorites", async () => {
  const h = app({
    stored: {
      "skycast-cached-weather": JSON.stringify(weather("Blantyre")),
      favoriteCities: "{}",
    },
    fetch: async () => {
      throw new TypeError("Offline");
    },
  });
  // TypeError must come from the same browser realm as the API code.
  h.window.fetch = async () => {
    throw new h.window.TypeError("Offline");
  };
  await h.load("js/main.js");
  await tick();
  assert.equal(
    h.document.getElementById("city-name").textContent,
    "Blantyre, Malawi",
  );
  assert.equal(h.document.querySelectorAll(".favorite-chip").length, 0);
  h.close();
});

test("corrupt cached weather and blocked storage never crash startup", async () => {
  for (const blocked of [false, true]) {
    const h = app({
      storageBlocked: blocked,
      stored: { "skycast-cached-weather": "{bad" },
    });
    h.window.fetch = async () => {
      throw new h.window.TypeError("Offline");
    };
    await h.load("js/main.js");
    await tick();
    assert.equal(
      h.document.querySelectorAll("[data-weather-loading].sky-is-loading")
        .length,
      0,
    );
    assert.match(
      h.document.getElementById("error-message").textContent,
      /internet connection/,
    );
    h.close();
  }
});

test("blocked storage cannot turn successful live weather into an error", async () => {
  const h = app({ storageBlocked: true });
  await h.load("js/main.js");
  await tick();
  assert.equal(h.document.getElementById("temperature").textContent, "22°C");
  assert.equal(h.document.getElementById("error-message").textContent, "");
  h.close();
});

test("missing geolocation restores the button with an actionable message", async () => {
  const h = app();
  await h.load("js/main.js");
  await tick();
  h.document.getElementById("current-location-button").click();
  assert.equal(
    h.document.getElementById("current-location-button").disabled,
    false,
  );
  assert.match(
    h.document.getElementById("error-message").textContent,
    /not supported/,
  );
  h.close();
});

test("API text and icon attributes cannot inject HTML or event handlers", async () => {
  const h = app();
  const ui = await h.load("js/ui.js");
  const data = weather('<img src=x onerror="alert(1)">');
  data.forecast.forecastday[0].day.condition = {
    text: 'Sunny" onerror="alert(1)',
    icon: '//cdn.example/icon.png" onerror="alert(1)',
  };
  ui.displayWeather(data);
  assert.equal(h.document.querySelectorAll("[onerror]").length, 0);
  assert.equal(h.document.getElementById("city-name").children.length, 0);
  const { escapeHtml } = await h.load("js/utils.js");
  assert.equal(escapeHtml("\"<>'&"), "&quot;&lt;&gt;&#39;&amp;");
  h.close();
});

test("unexpected weather payload is rejected and all loading states are released", async () => {
  const h = app({ fetch: async () => response({ location: {} }) });
  await h.load("js/main.js");
  await tick();
  assert.match(
    h.document.getElementById("error-message").textContent,
    /Invalid weather data/,
  );
  assert.equal(h.document.querySelectorAll(".sky-is-loading").length, 0);
  h.close();
});

test("radar stays busy until its own fetch completes, then reports a provider outage", async () => {
  const pending = deferred();
  const h = app({ fetch: () => pending.promise });
  const map = {
    setView() {
      return this;
    },
    invalidateSize() {},
    removeLayer() {},
  };
  h.window.L = {
    map: () => map,
    tileLayer: () => ({
      addTo() {
        return this;
      },
    }),
  };
  // Older jsdom exposes the browser AbortSignal without timeout.
  h.window.AbortSignal.timeout ||= () => new h.window.AbortController().signal;
  const skeleton = await h.load("js/skeletons.js");
  const radar = await h.load("js/radar.js");
  radar.initializeRadar(weather());
  skeleton.setWeatherSkeletons(false);
  const section = h.document.querySelector(".weather-radar-section");
  assert.equal(section.getAttribute("aria-busy"), "true");
  pending.reject(new Error("Provider down"));
  await tick();
  assert.equal(section.getAttribute("aria-busy"), "false");
  assert.match(
    h.document.querySelector(".radar-status").textContent,
    /unavailable/,
  );
  h.close();
});

test("broken optional radar library cannot prevent caching successful weather", async () => {
  const h = app();
  h.window.L = {
    map() {
      throw new Error("Library initialization failed");
    },
  };
  await h.load("js/main.js");
  await tick();
  assert.equal(h.document.getElementById("temperature").textContent, "22°C");
  assert.ok(h.window.localStorage.getItem("skycast-cached-weather"));
  assert.equal(h.document.getElementById("error-message").textContent, "");
  h.close();
});
