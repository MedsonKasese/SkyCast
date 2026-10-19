import { getWeather, isWeatherData } from "./api.js";
import { applyTheme, getSettings } from "./settings.js";
import { readStorage } from "./storage.js";
import { forecastUrl, renderForecastDetails } from "./forecast-details.js";

applyTheme();
const params = new URLSearchParams(window.location.search);
const container = document.getElementById("forecast-details");
const status = document.getElementById("forecast-status");
const navigation = document.getElementById("forecast-day-navigation");
const date = params.get("date");
const query = params.get("q");
const cacheKey = "skycast-cached-weather";

function cachedForecast() {
  try {
    const cached = JSON.parse(readStorage(cacheKey));
    if (!isWeatherData(cached)) return null;
    const { lat, lon, name } = cached.location;
    const sameLocation = query === `${lat},${lon}` || query?.toLowerCase() === name.toLowerCase();
    return sameLocation && cached.forecast.forecastday.some((day) => day.date === date) ? cached : null;
  } catch { return null; }
}

async function init() {
  try {
    if (!query?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
      throw new Error("Choose a day from the 3-day forecast to view its details.");
    }
    let weather;
    let offline = false;
    try {
      weather = await getWeather(query);
    } catch (error) {
      weather = error.message === "NETWORK_ERROR" ? cachedForecast() : null;
      if (!weather) throw error;
      offline = true;
    }
    const day = weather.forecast.forecastday.find((item) => item.date === date);
    if (!day) throw new Error("This date is no longer in the available forecast. Go back and choose an available day.");
    renderForecastDetails(container, weather, day, getSettings().units === "f");
    document.title = `${date} Forecast · ${weather.location.name} | SkyCast`;
    status.textContent = offline
      ? `You're offline. Showing saved forecast data from ${weather.location.localtime}.`
      : "Forecast details. Temperature units follow your settings.";
    for (const item of weather.forecast.forecastday) {
      const link = document.createElement("a");
      link.href = forecastUrl(weather, item.date);
      link.textContent = item.date;
      if (item.date === date) link.setAttribute("aria-current", "page");
      navigation.appendChild(link);
    }
  } catch (error) {
    status.textContent = error.message === "NETWORK_ERROR"
      ? "Unable to load this forecast. Check your connection and try again."
      : error.message;
    container.replaceChildren();
    const heading = document.createElement("h1");
    heading.id = "forecast-title";
    heading.textContent = "Forecast unavailable";
    container.appendChild(heading);
  } finally {
    container.classList.remove("sky-is-loading");
    container.setAttribute("aria-busy", "false");
    container.removeAttribute("inert");
  }
}
void init();
