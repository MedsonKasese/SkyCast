import { escapeHtml } from "./utils.js";

export function forecastUrl(weather, date) {
  // Coordinates keep cities with the same name distinct across navigation.
  const { lat, lon, name } = weather.location;
  const query = Number.isFinite(lat) && Number.isFinite(lon) ? `${lat},${lon}` : name;
  return `forecast.html?${new URLSearchParams({ q: query, date })}`;
}

export function notificationForecastUrl(notification) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(notification?.forecastDate || "")) return null;
  const query = notification.locationQuery || notification.location;
  if (typeof query !== "string" || !query.trim()) return null;
  return `forecast.html?${new URLSearchParams({ q: query, date: notification.forecastDate })}`;
}

function number(value) {
  return (typeof value === "number" || (typeof value === "string" && value.trim())) && Number.isFinite(Number(value))
    ? Number(value) : null;
}

export function measurement(value, unit = "") {
  const amount = number(value);
  return amount === null ? "Unavailable" : `${Math.round(amount * 10) / 10}${unit}`;
}

function rainfall(mm, inches, isFahrenheit) {
  const amount = isFahrenheit
    ? number(inches) ?? (number(mm) === null ? null : Number(mm) / 25.4)
    : number(mm) ?? (number(inches) === null ? null : Number(inches) * 25.4);
  return amount === null ? "Unavailable" : `${Math.round(amount * 100) / 100} ${isFahrenheit ? "in" : "mm"}`;
}

export function temperature(celsius, fahrenheit, isFahrenheit) {
  const c = number(celsius);
  const f = number(fahrenheit);
  return isFahrenheit
    ? measurement(f ?? (c === null ? null : c * 9 / 5 + 32), "°F")
    : measurement(c ?? (f === null ? null : (f - 32) * 5 / 9), "°C");
}

export function renderForecastDetails(container, weather, day, isFahrenheit = false) {
  const summary = day.day;
  const temp = (c, f) => temperature(c, f, isFahrenheit);
  const wind = (kph, mph) => isFahrenheit
    ? measurement(number(mph) ?? (number(kph) === null ? null : Number(kph) / 1.609344), " mph")
    : measurement(kph, " km/h");
  const date = new Date(`${day.date}T12:00:00`);
  const title = Number.isNaN(date.getTime()) ? day.date : date.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const facts = [
    ["High", temp(summary.maxtemp_c, summary.maxtemp_f)],
    ["Low", temp(summary.mintemp_c, summary.mintemp_f)],
    ["Average temperature", temp(summary.avgtemp_c, summary.avgtemp_f)],
    ["Chance of rain", measurement(summary.daily_chance_of_rain, "%")],
    ["Expected rainfall", rainfall(summary.totalprecip_mm, summary.totalprecip_in, isFahrenheit)],
    ["Maximum wind", wind(summary.maxwind_kph, summary.maxwind_mph)],
    ["Average humidity", measurement(summary.avghumidity, "%")],
    ["UV index", measurement(summary.uv)],
    ["Sunrise", day.astro?.sunrise || "Unavailable"],
    ["Sunset", day.astro?.sunset || "Unavailable"],
  ];
  const esc = escapeHtml;
  container.innerHTML = `
    <header class="forecast-detail-heading">
      <p>Daily forecast · ${esc(weather.location.name)}, ${esc(weather.location.country || "")}</p>
      <h1 id="forecast-title">${esc(title)}</h1>
      <p>${esc(summary.condition?.text || "Condition unavailable")}</p>
      <p>High ${esc(facts[0][1])} / Low ${esc(facts[1][1])}</p>
    </header>
    <dl class="forecast-facts">${facts.map(([label, value]) => `
      <div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>
    <h2>Hourly details</h2>
    <p class="forecast-time-note">Times are local to ${esc(weather.location.name)}. Forecasts may change.</p>
    <div class="forecast-hour-list">${(day.hour || []).map((hour) => `
      <article class="forecast-hour-row">
        <h3>${esc(String(hour.time || "").split(" ")[1] || "Time unavailable")}</h3>
        <p>${esc(hour.condition?.text || "Condition unavailable")}</p>
        <p>${esc(temp(hour.temp_c, hour.temp_f))} · Feels like ${esc(temp(hour.feelslike_c, hour.feelslike_f))}</p>
        <p>Rain ${esc(measurement(hour.chance_of_rain, "%"))} · ${esc(rainfall(hour.precip_mm, hour.precip_in, isFahrenheit))} · Wind ${esc(wind(hour.wind_kph, hour.wind_mph))}</p>
      </article>`).join("") || "<p>Hourly forecast unavailable for this day.</p>"}</div>`;
}
