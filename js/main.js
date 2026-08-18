// Imports
import { getWeather } from "./api.js";
import { displayWeather } from "./ui.js";

// Global Variables
let currentCity = "Mzuzu";
let isFahrenheit = false;
let favoriteCities = [];

const STORAGE_KEY = "skycast-last-city";
const WEATHER_CACHE_KEY = "skycast-cached-weather";
const FAVORITES_KEY = "favoriteCities";

// DOM Elements
const searchButton = document.getElementById("search-button");
const weatherForm = document.getElementById("search-form");
const cityInput = document.getElementById("search-box");
const currentLocationButton = document.getElementById(
  "current-location-button",
);
const errorMessage = document.getElementById("error-message");
const unitsIcon = document.querySelector(".units-icon");
const favoritesList = document.getElementById("favorites-list");
const addFavoriteButton = document.getElementById("add-favorite-btn");

// Event Listeners
weatherForm.addEventListener("submit", handleSearch);
currentLocationButton.addEventListener("click", getCurrentLocation);
if (unitsIcon) {
  unitsIcon.addEventListener("click", toggleUnits);
  unitsIcon.style.cursor = "pointer";
}
if (addFavoriteButton) {
  addFavoriteButton.addEventListener("click", saveCurrentCity);
}

// Initialize App
init();

// =========================
// INIT
// =========================
async function init() {
  const savedCity = localStorage.getItem(STORAGE_KEY);

  if (savedCity) {
    currentCity = savedCity;
  }
  loadFavorites();

  try {
    await loadWeather(currentCity);
  } catch (error) {
    const cachedWeather = getCachedWeather();

    if (cachedWeather) {
      displayWeather(cachedWeather);

      // Show message after UI update
      requestAnimationFrame(() => {
        showError("You're offline. Showing the last saved weather data.");
      });
    } else {
      showError(
        "Unable to load weather data. Please check your internet connection.",
      );
    }
  }
}
/*

	try {
		await loadWeather(currentCity);
	} catch (error) {
		if (error.message === "NETWORK_ERROR") {
			const cachedWeather = getCachedWeather();

			if (cachedWeather) {
				displayWeather(cachedWeather);
				requestAnimationFrame(() => {
					showError("You're offline. Showing the last saved weather data.");
				});
			} else {
				showError("No internet connection and no cached weather available.");
			}
		} else {
			showError(error.message || "Failed to refresh weather.");
		}
	} finally {
		setLoadingState(refreshButton, false);
	}
}
*/

// =========================
// LOAD WEATHER
// =========================
async function loadWeather(cityName) {
  const weather = await getWeather(cityName);
  displayWeather(weather);

  saveWeatherToCache(weather);
  return weather;
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

  if (cityName.toLowerCase() === currentCity.toLowerCase()) {
    cityInput.value = "";
    cityInput.blur();
    return;
  }

  hideError();
  setLoadingState(searchButton, true, "Searching...");

  try {
    await loadWeather(cityName);

    currentCity = cityName;

    localStorage.setItem(STORAGE_KEY, currentCity);

    cityInput.value = "";
    cityInput.blur();
  } catch (error) {
    if (error.message === "NETWORK_ERROR") {
      const cachedWeather = getCachedWeather();

      if (cachedWeather) {
        displayWeather(cachedWeather);

        // Show message after UI update
        requestAnimationFrame(() => {
          showError("You're offline. Showing the last saved weather data.");
        });
      } else {
        showError("No internet connection and no cached weather available.");
      }
    } else {
      showError(
        error.message || "Place not found. Please enter a valid place name.",
      );
    }
  } finally {
    setLoadingState(searchButton, false);
  }
}

// =========================
// CURRENT LOCATION
// =========================
function getCurrentLocation() {
  hideError();

  setLoadingState(currentLocationButton, true, "Getting your location...");

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
    const weather = await getWeather(coordinates);

    displayWeather(weather);

    currentCity = weather.location.name;
    localStorage.setItem(STORAGE_KEY, currentCity);
  } catch (error) {
    if (error.message === "NETWORK_ERROR") {
      const cachedWeather = getCachedWeather();

      if (cachedWeather) {
        displayWeather(cachedWeather);

        // Show message after UI update
        requestAnimationFrame(() => {
          showError("You're offline. Showing the last saved weather data.");
        });
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
    button.dataset.originalText = button.textContent;
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
  localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weather));
}

// GET WEATHER FROM CACHE
function getCachedWeather() {
  const cached = localStorage.getItem(WEATHER_CACHE_KEY);

  return cached ? JSON.parse(cached) : null;
}
// =========================
// FAVORITES
// =========================

function loadFavorites() {
  const saved = localStorage.getItem(FAVORITES_KEY);

  if (!saved) {
    favoriteCities = [];
    renderFavorites();
    return;
  }

  try {
    favoriteCities = JSON.parse(saved);
  } catch (error) {
    console.error("Invalid favorites data:", error);

    favoriteCities = [];

    localStorage.removeItem(FAVORITES_KEY);
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

    chip.className = "favorite-chip";
    chip.textContent = city;

    chip.addEventListener("click", () => handleFavoriteCity(city));

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
    await loadWeather(city);

    currentCity = city;

    localStorage.setItem(STORAGE_KEY, currentCity);

    cityInput.value = "";
  } catch (error) {
    console.error("Favorite city error:", error);

    if (error.message === "NETWORK_ERROR") {
      const cachedWeather = getCachedWeather();

      if (cachedWeather) {
        displayWeather(cachedWeather);

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
  if (!currentCity) {
    showError("No city found.");
    return;
  }

  if (favoriteCities.includes(currentCity)) {
    showError("City is already in favorites.");
    return;
  }

  favoriteCities.push(currentCity);

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteCities));

  renderFavorites();

  showError(`${currentCity} added to favorites.`);
}

// =========================
// TOGGLE UNITS
// =========================
function toggleUnits() {
  isFahrenheit = !isFahrenheit;

  const temperatureElement = document.getElementById("temperature");
  const feelsLikeElement = document.getElementById("feels-like");

  if (temperatureElement && temperatureElement.textContent !== "-") {
    const currentTemperature = parseFloat(temperatureElement.textContent);

    if (isFahrenheit) {
      temperatureElement.textContent = Math.round(
        (currentTemperature * 9) / 5 + 32,
      );
    } else {
      temperatureElement.textContent = Math.round(
        ((currentTemperature - 32) * 5) / 9,
      );
    }
  }

  if (feelsLikeElement && feelsLikeElement.textContent !== "-") {
    const currentFeelsLike = parseFloat(feelsLikeElement.textContent);

    if (isFahrenheit) {
      feelsLikeElement.textContent = Math.round(
        (currentFeelsLike * 9) / 5 + 32,
      );
    } else {
      feelsLikeElement.textContent = Math.round(
        ((currentFeelsLike - 32) * 5) / 9,
      );
    }
  }

  unitsIcon.textContent = isFahrenheit ? "°F" : "°C";
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
