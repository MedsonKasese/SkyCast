// Imports
import { getWeather, isWeatherData } from "./api.js";
import { displayWeather } from "./ui.js";
import { setWeatherSkeletons, setSportsLoading } from "./skeletons.js";
import { centerRadarOnLocation } from "./radar.js";
import { loadSports, invalidateSportsRequest } from "./sports.js";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "./notifications.js";
import { escapeHtml } from "./utils.js";
import { applyTheme, getSettings } from "./settings.js";

import { readStorage, writeStorage, removeStorage } from "./storage.js";
// Global Variables
let currentCity = "Mzuzu";
const STORAGE_KEY = "skycast-last-city";
const WEATHER_CACHE_KEY = "skycast-cached-weather";
const FAVORITES_KEY = "favoriteCities";
let isFahrenheit = getSettings().units === "f";
let favoriteCities = [];
let weatherRequestController = null;
let currentWeatherData = null;
let searchActionId = 0;

applyTheme();

// DOM Elements
const searchButton = document.getElementById("search-button");
const weatherForm = document.getElementById("search-form");
const cityInput = document.getElementById("search-box");
const currentLocationButton = document.getElementById(
  "current-location-button",
);
const errorMessage = document.getElementById("error-message");
const favoritesList = document.getElementById("favorites-list");
const addFavoriteButton = document.getElementById("add-favorite-btn");
const radarLocationButton = document.getElementById("radar-location-button");
const notificationButton = document.getElementById("notification-button");
const notificationBadge = document.getElementById("notification-badge");
const notificationsPanel = document.getElementById("notifications-panel");
const notificationsList = document.getElementById("notifications-list");
const markAllReadButton = document.getElementById("mark-all-read-button");

// Event Listeners
weatherForm.addEventListener("submit", handleSearch);
currentLocationButton.addEventListener("click", getCurrentLocation);
if (notificationButton) {
  notificationButton.addEventListener("click", toggleNotificationsPanel);
}

if (markAllReadButton) {
  markAllReadButton.addEventListener("click", handleMarkAllNotificationsAsRead);
}

if (notificationsPanel) {
  notificationsPanel.addEventListener("click", handleNotificationClick);
}

document.addEventListener("click", handleOutsideNotificationClick);

document.addEventListener("keydown", handleNotificationEscape);

if (addFavoriteButton) {
  addFavoriteButton.addEventListener("click", saveCurrentCity);
}
if (radarLocationButton) {
  radarLocationButton.addEventListener("click", centerRadarOnLocation);
}

// Initialize App
init();

// =========================
// INIT
// =========================
async function init() {
  const savedCity = readStorage(STORAGE_KEY);

  if (savedCity) {
    currentCity = savedCity;
  }
  loadFavorites();

  try {
    await loadWeather(currentCity);
  } catch (error) {
    if (error.name === "AbortError") return;
    const cachedWeather =
      error.message === "NETWORK_ERROR" ? getCachedWeather() : null;

    if (cachedWeather) {
      currentWeatherData = cachedWeather;
      currentCity = cachedWeather.location.name;
      displayWeather(cachedWeather, isFahrenheit);
      showError("You're offline. Showing the last saved weather data.");
    } else {
      showError(
        error.message === "NETWORK_ERROR"
          ? "Unable to load weather data. Please check your internet connection."
          : error.message || "Unable to load weather data.",
      );
    }
  }
}

// =========================
// LOAD WEATHER
// =========================
async function loadWeather(cityName) {
  weatherRequestController?.abort();
  const controller = new AbortController();
  weatherRequestController = controller;
  invalidateSportsRequest();
  setWeatherSkeletons(true);
  setSportsLoading(true);
  try {
    const weather = await getWeather(cityName, controller.signal);
    if (weatherRequestController !== controller) return null;
    currentWeatherData = weather;
    displayWeather(weather, isFahrenheit);
    currentCity = weather.location.name;
    writeStorage(STORAGE_KEY, currentCity);
    saveWeatherToCache(weather);
    updateNotificationBadge();
    // Sports must not keep weather searches pending or commit stale locations.
    void loadSports(currentCity)
      .then(() => {
        if (weatherRequestController === controller) updateNotificationBadge();
      })
      .catch((error) => console.error("Sports refresh failed:", error));
    return weather;
  } catch (error) {
    if (weatherRequestController !== controller) {
      throw new DOMException("Superseded weather request", "AbortError");
    }
    invalidateSportsRequest(false);
    setSportsLoading(false);
    throw error;
  } finally {
    if (weatherRequestController === controller) setWeatherSkeletons(false);
  }
}
// =========================
// HANDLE SEARCH
// =========================
async function handleSearch(event) {
  event.preventDefault();

  const cityName = cityInput.value.trim();

  if (!cityName) {
    showError("Please enter a place name.");
    return;
  }

  if (
    currentWeatherData &&
    cityName.toLowerCase() === currentCity.toLowerCase()
  ) {
    cityInput.value = "";
    cityInput.blur();
    return;
  }

  hideError();
  const actionId = ++searchActionId;
  setLoadingState(searchButton, true, "Searching...");

  try {
    const weather = await loadWeather(cityName);
    if (!weather) {
      return;
    }

    cityInput.value = "";
    cityInput.blur();
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    if (error.message === "NETWORK_ERROR") {
      const cachedWeather = getCachedWeather();

      if (cachedWeather) {
        currentWeatherData = cachedWeather;
        currentCity = cachedWeather.location.name;
        displayWeather(cachedWeather, isFahrenheit);
        updateNotificationBadge();
        showError("You're offline. Showing the last saved weather data.");
      } else {
        showError("No internet connection and no cached weather available.");
      }
    } else {
      showError(
        error.message || "Place not found. Please enter a valid place name.",
      );
    }
  } finally {
    if (actionId === searchActionId) setLoadingState(searchButton, false);
  }
}

// =========================
// CURRENT LOCATION
// =========================
function getCurrentLocation() {
  hideError();

  setLoadingState(currentLocationButton, true, "Getting your location...");

  if (!navigator.geolocation) {
    setLoadingState(currentLocationButton, false);
    showError("Geolocation is not supported by this browser.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    handleCurrentPosition,
    handleLocationError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000,
    },
  );
}

async function handleCurrentPosition(position) {
  const { latitude, longitude } = position.coords;
  const coordinates = `${latitude},${longitude}`;

  try {
    const weather = await loadWeather(coordinates);
    if (!weather) {
      return;
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    if (error.message === "NETWORK_ERROR") {
      const cachedWeather = getCachedWeather();

      if (cachedWeather) {
        currentWeatherData = cachedWeather;
        currentCity = cachedWeather.location.name;
        displayWeather(cachedWeather, isFahrenheit);
        showError("You're offline. Showing the last saved weather data.");
      } else {
        showError("No internet connection and no cached weather available.");
      }
    } else {
      showError("Unable to retrieve weather data for your current location.");
    }
  } finally {
    setLoadingState(currentLocationButton, false);
  }
}

//HANDLE LOCATION ERRORS
function handleLocationError(error) {
  setLoadingState(currentLocationButton, false);

  switch (error.code) {
    case error.PERMISSION_DENIED:
      showError(
        "Location permission denied. Please allow location access in your browser settings.",
      );
      break;

    case error.POSITION_UNAVAILABLE:
      showError("Your device couldn't determine your location.");
      break;

    case error.TIMEOUT:
      showError("Location request timed out. Please try again.");
      break;

    default:
      showError("Unable to retrieve your location.");
      break;
  }

  //console.log(error);
}

// =========================
// LOADING STATE
// =========================
function setLoadingState(button, isLoading, loadingText = "Loading...") {
  if (isLoading) {
    if (!button.disabled) button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

// =========================
// ERROR HANDLING
// =========================
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
}

function hideError() {
  errorMessage.textContent = "";
  errorMessage.style.display = "none";
}

// SAVE WEATHER TO CACHE
function saveWeatherToCache(weather) {
  writeStorage(WEATHER_CACHE_KEY, JSON.stringify(weather));
}

// GET WEATHER FROM CACHE
function getCachedWeather() {
  try {
    const cached = JSON.parse(readStorage(WEATHER_CACHE_KEY));
    return isWeatherData(cached) ? cached : null;
  } catch {
    removeStorage(WEATHER_CACHE_KEY);
    return null;
  }
}
// =========================
// FAVORITES
// =========================

function loadFavorites() {
  const saved = readStorage(FAVORITES_KEY);

  if (!saved) {
    favoriteCities = [];
    renderFavorites();
    return;
  }

  try {
    const parsed = JSON.parse(saved);
    favoriteCities = Array.isArray(parsed)
      ? [
          ...new Set(
            parsed.filter((city) => typeof city === "string" && city.trim()),
          ),
        ]
      : [];
  } catch (error) {
    console.error("Invalid favorites data:", error);

    favoriteCities = [];

    removeStorage(FAVORITES_KEY);
  }

  renderFavorites();
}

// =========================
// RENDER FAVORITES
// =========================

function renderFavorites() {
  if (!favoritesList) {
    return;
  }

  favoritesList.innerHTML = "";

  favoriteCities.forEach((city) => {
    const chip = document.createElement("button");

    chip.type = "button";
    chip.className = "favorite-chip";
    chip.textContent = city;

    chip.addEventListener("click", () => handleFavoriteCity(city));

    chip.addEventListener("dblclick", () => removeFavoriteCity(city));

    favoritesList.appendChild(chip);
  });
}

// =========================
// HANDLE FAVORITE CITY
// =========================

async function handleFavoriteCity(city) {
  cityInput.value = city;

  hideError();

  try {
    const weather = await loadWeather(city);
    if (!weather) {
      return;
    }
    cityInput.value = "";
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }
    console.error("Favorite city error:", error);

    if (error.message === "NETWORK_ERROR") {
      const cachedWeather = getCachedWeather();

      if (cachedWeather) {
        currentWeatherData = cachedWeather;
        currentCity = cachedWeather.location.name;
        displayWeather(cachedWeather, isFahrenheit);

        showError("You're offline. Showing the last saved weather data.");
      } else {
        showError("No internet connection and no cached weather available.");
      }
    } else {
      showError(error.message || "Unable to load this favorite city.");
    }
  }
}

// =========================
// SAVE CURRENT CITY
// =========================

function saveCurrentCity() {
  if (!currentWeatherData) {
    showError("No city found.");
    return;
  }

  currentCity = currentWeatherData.location.name;
  if (
    favoriteCities.some(
      (city) => city.toLowerCase() === currentCity.toLowerCase(),
    )
  ) {
    showError(`${currentCity} is already in favorites.`);
    return;
  }

  favoriteCities.push(currentCity);

  writeStorage(FAVORITES_KEY, JSON.stringify(favoriteCities));

  renderFavorites();

  showError(`${currentCity} added to favorites.`);
}

// =========================
// REMOVE FAVORITE CITY
// =========================

function removeFavoriteCity(city) {
  const confirmed = confirm(
    `Are you sure you want to remove ${city} from favorites?`,
  );
  if (!confirmed) {
    return;
  }
  favoriteCities = favoriteCities.filter((favorite) => favorite !== city);

  writeStorage(FAVORITES_KEY, JSON.stringify(favoriteCities));

  renderFavorites();

  showError(`${city} removed from favorites.`);
}

// =========================
// NOTIFICATIONS CENTER
// =========================

function toggleNotificationsPanel(event) {
  event.stopPropagation();

  if (!notificationsPanel) {
    return;
  }

  const isOpen = notificationsPanel.classList.toggle("is-open");

  notificationsPanel.setAttribute("aria-hidden", isOpen ? "false" : "true");

  if (isOpen) {
    renderNotifications();
  }
}

function closeNotificationsPanel() {
  if (!notificationsPanel) {
    return;
  }

  notificationsPanel.classList.remove("is-open");
  notificationsPanel.setAttribute("aria-hidden", "true");
}

function handleMarkAllNotificationsAsRead(event) {
  event.stopPropagation();

  markAllNotificationsAsRead();
  renderNotifications();
}

function handleNotificationClick(event) {
  const notificationItem = event.target.closest(".notification-item");

  if (!notificationItem) {
    return;
  }

  const notificationId = notificationItem.dataset.notificationId;

  if (!notificationId) {
    return;
  }

  markNotificationAsRead(notificationId);
  renderNotifications();
}

function handleOutsideNotificationClick(event) {
  if (!notificationsPanel || !notificationButton) {
    return;
  }

  const clickedInsidePanel = notificationsPanel.contains(event.target);

  const clickedBell = notificationButton.contains(event.target);

  if (!clickedInsidePanel && !clickedBell) {
    closeNotificationsPanel();
  }
}

function handleNotificationEscape(event) {
  if (event.key !== "Escape") {
    return;
  }

  closeNotificationsPanel();
}

function renderNotifications() {
  if (!notificationsList) {
    return;
  }

  const notifications = getNotifications();

  if (notifications.length === 0) {
    notificationsList.innerHTML = `
      <div class="notifications-empty">
        <span class="notifications-empty-icon">🔔</span>
        <p>No notifications yet.</p>
      </div>
    `;

    updateNotificationBadge();
    return;
  }

  notificationsList.innerHTML = notifications
    .map(
      (notification) => `
        <div
          class="notification-item ${notification.read ? "read" : "unread"}"
          data-notification-id="${escapeHtml(notification.id)}"
        >
          <div class="notification-item-header">
            <span class="notification-item-icon">
              ${notification.type === "weather-alert" ? "⚠️" : "🔔"}
            </span>

            <h3 class="notification-item-title">
              ${escapeHtml(notification.title)}
            </h3>
          </div>

          <p class="notification-item-message">
            ${escapeHtml(notification.message)}
          </p>

          <div class="notification-item-meta">
            ${escapeHtml(notification.event || "Notification")}
          </div>
        </div>
      `,
    )
    .join("");

  updateNotificationBadge();
}

function updateNotificationBadge() {
  if (!notificationBadge) {
    return;
  }

  const unreadCount = getUnreadNotificationCount();

  notificationBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;

  notificationBadge.style.display = unreadCount > 0 ? "block" : "none";

  notificationBadge.setAttribute(
    "aria-hidden",
    unreadCount > 0 ? "false" : "true",
  );
}

// =========================
// SERVICE WORKER
// =========================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        console.log("Service Worker registered");
      })
      .catch(console.error);
  });
}
