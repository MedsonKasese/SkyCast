import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { evaluateWeatherNotifications } from "../js/notification-rules.js";
import {
  getNotifications,
  markNotificationAsRead,
  syncWeatherNotifications,
} from "../js/notifications.js";

const store = new Map();
globalThis.localStorage = {
  getItem(key) {
    return store.has(key) ? store.get(key) : null;
  },
  setItem(key, value) {
    store.set(key, String(value));
  },
  removeItem(key) {
    store.delete(key);
  },
};

beforeEach(() => store.clear());

function forecast(day, date = "2026-10-20") {
  return {
    location: { name: "Mzuzu" },
    forecast: { forecastday: [{ date, day }] },
    alerts: { alert: [] },
  };
}

test("Celsius evaluation provides rain chance and amount, wind, temperature, and day metadata", () => {
  const notifications = evaluateWeatherNotifications(
    forecast({
      daily_chance_of_rain: 80,
      totalprecip_mm: 12.4,
      maxwind_kph: 70,
      maxtemp_c: 36,
      mintemp_c: 2,
      condition: { text: "Thunderstorms", code: 1087 },
    }),
  );

  assert.deepEqual(
    notifications.map(({ conditionKey }) => conditionKey),
    ["rain", "wind", "high-temperature", "low-temperature"],
  );
  const [rain, wind, high, low] = notifications;
  assert.equal(rain.title, "Rain Likely");
  assert.match(rain.message, /80% chance of rain/);
  assert.match(rain.message, /Forecast rainfall: 12\.4 mm/);
  assert.doesNotMatch(`${rain.title} ${rain.message}`, /heavy rain/i);
  assert.match(wind.message, /70 km\/h/);
  assert.match(high.message, /36°C/);
  assert.match(low.message, /2°C/);
  for (const notification of notifications) {
    assert.equal(notification.forecastDate, "2026-10-20");
    assert.equal(notification.location, "Mzuzu");
  }
});

test("Fahrenheit evaluation handles F-only fields and uses mph/inches", () => {
  const notifications = evaluateWeatherNotifications(
    forecast({
      daily_chance_of_rain: 75,
      totalprecip_in: 0.75,
      maxwind_mph: 62,
      maxtemp_f: 98,
      mintemp_f: 35,
    }),
    true,
  );

  const byCondition = Object.fromEntries(
    notifications.map((notification) => [notification.conditionKey, notification]),
  );
  assert.match(byCondition.rain.message, /75% chance of rain/);
  assert.match(byCondition.rain.message, /0\.8 in/);
  assert.match(byCondition.wind.message, /62 mph/);
  assert.match(byCondition["high-temperature"].message, /98°F/);
  assert.match(byCondition["low-temperature"].message, /35°F/);
});

test("null, missing, blank, and non-finite numeric fields do not create alerts", () => {
  const notifications = evaluateWeatherNotifications(
    forecast({
      daily_chance_of_rain: null,
      totalprecip_mm: null,
      maxwind_kph: undefined,
      maxwind_mph: "",
      maxtemp_c: null,
      maxtemp_f: "not a number",
      mintemp_c: undefined,
      mintemp_f: null,
    }),
  );
  assert.deepEqual(notifications, []);
});

test("sync uses saved units, preserves evaluated title/message, metadata, stable IDs, and read state", () => {
  store.set("skycast-settings", JSON.stringify({ units: "f" }));
  const data = forecast({
    daily_chance_of_rain: 80,
    totalprecip_mm: 25.4,
    maxwind_kph: 100,
    maxtemp_c: 37,
    mintemp_c: 1,
  });
  data.alerts.alert.push({
    event: "Storm Warning",
    headline: "Storm warning for Mzuzu",
    desc: "Seek shelter if needed.",
    severity: "Severe",
  });

  const first = syncWeatherNotifications(data);
  const official = first.find((item) => item.type === "weather-alert");
  const rain = first.find((item) => item.conditionKey === "rain");
  assert.equal(official.title, "Storm warning for Mzuzu");
  assert.equal(official.message, "Seek shelter if needed.");
  assert.equal(rain.forecastDate, "2026-10-20");
  assert.equal(rain.conditionKey, "rain");
  assert.match(rain.message, /1 in/);
  assert.match(first.find((item) => item.conditionKey === "wind").message, /62 mph/);

  markNotificationAsRead(rain.id);
  const second = syncWeatherNotifications(data);
  assert.deepEqual(
    second.map((item) => item.id),
    first.map((item) => item.id),
  );
  assert.equal(second.find((item) => item.id === rain.id).read, true);
  assert.equal(getNotifications().find((item) => item.id === rain.id).read, true);
});

test("legacy rain IDs keep their read state while the visible title becomes Rain Likely", () => {
  const data = forecast({ daily_chance_of_rain: 80 });
  const rawId = ["weather-alert", "Mzuzu", "Heavy Rain Expected (2026-10-20)", "", "", ""].join("|");
  let hash = 0;
  for (const character of rawId) { hash = (hash << 5) - hash + character.charCodeAt(0); hash |= 0; }
  const id = `weather-${Math.abs(hash)}`;
  store.set("skycast-notifications", JSON.stringify([{ id, type: "weather-condition", read: true }]));
  const [rain] = syncWeatherNotifications(data);
  assert.equal(rain.id, id);
  assert.equal(rain.title, "Rain Likely");
  assert.equal(rain.read, true);
});

test("boolean and whitespace values are not interpreted as freezing temperatures", () => {
  for (const value of [false, true, " ", "\t"]) {
    assert.deepEqual(evaluateWeatherNotifications(forecast({ mintemp_c: value, mintemp_f: value })), []);
  }
});

test("forecast notifications persist distinct coordinates for same-named locations", () => {
  for (const [lat, lon] of [[-11.46, 34.02], [40.71, -74.01]]) {
    const data = forecast({ maxtemp_c: 38 });
    data.location = { name: "Same city name", lat, lon };
    assert.equal(syncWeatherNotifications(data)[0].locationQuery, `${lat},${lon}`);
  }
});
