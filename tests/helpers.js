import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";

export const root = resolve(import.meta.dirname, "..");
export const tick = async () => {
  for (let i = 0; i < 8; i++) await new Promise(setImmediate);
};
export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
export const response = (data, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
export function weather(name = "Mzuzu") {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    time_epoch: Math.floor(Date.now() / 1000) + (i + 1) * 3600,
    time: `2026-10-20 ${String(i).padStart(2, "0")}:00`,
    temp_c: 22,
    temp_f: 72,
    condition: {
      text: "Sunny",
      icon: "//cdn.weatherapi.com/weather/64x64/day/113.png",
    },
  }));
  const day = {
    date: "2026-10-20",
    day: {
      maxtemp_c: 25,
      mintemp_c: 15,
      maxtemp_f: 77,
      mintemp_f: 59,
      daily_chance_of_rain: 10,
      condition: hours[0].condition,
    },
    astro: { sunrise: "05:30 AM", sunset: "06:00 PM" },
    hour: hours,
  };
  return {
    location: {
      name,
      country: "Malawi",
      localtime: "2026-10-20 12:00",
      lat: -11.46,
      lon: 34.02,
    },
    current: {
      temp_c: 22,
      temp_f: 72,
      feelslike_c: 21,
      feelslike_f: 70,
      humidity: 60,
      wind_kph: 12,
      wind_mph: 7,
      precip_mm: 0,
      is_day: 1,
      condition: hours[0].condition,
    },
    forecast: {
      forecastday: [
        day,
        { ...day, date: "2026-10-21" },
        { ...day, date: "2026-10-22" },
      ],
    },
    alerts: { alert: [] },
  };
}
export function app({
  fetch,
  stored = {},
  storageBlocked = false,
  page = "index.html",
} = {}) {
  const dom = new JSDOM(readFileSync(resolve(root, page), "utf8"), {
    url: `https://skycast.test/${page}`,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {} });
  window.fetch =
    fetch ||
    (async (url) =>
      String(url).startsWith("/api/weather")
        ? response(weather())
        : response(
            String(url).startsWith("/api/leagues") ? { events: [] } : {},
          ));
  window.console = { log() {}, error() {}, warn() {} };
  for (const [key, value] of Object.entries(stored))
    window.localStorage.setItem(key, value);
  if (storageBlocked)
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage blocked");
      },
    });
  const context = dom.getInternalVMContext();
  const modules = new Map();
  function getModule(path) {
    if (!modules.has(path))
      modules.set(
        path,
        new vm.SourceTextModule(readFileSync(path, "utf8"), {
          context,
          identifier: path,
        }),
      );
    return modules.get(path);
  }
  async function load(file) {
    const module = getModule(resolve(root, file));
    if (module.status === "unlinked")
      await module.link((specifier, parent) =>
        getModule(resolve(dirname(parent.identifier), specifier)),
      );
    if (module.status === "linked") await module.evaluate();
    return module.namespace;
  }
  return {
    window,
    document: window.document,
    load,
    close: () => window.close(),
  };
}
export function search(harness, city) {
  harness.document.getElementById("search-box").value = city;
  harness.document
    .getElementById("search-form")
    .dispatchEvent(
      new harness.window.Event("submit", { bubbles: true, cancelable: true }),
    );
}
