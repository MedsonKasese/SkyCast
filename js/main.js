// Imports
import { getWeather } from "./api.js";
import { displayWeather } from "./ui.js";

// Global Variables
let currentCity = "Mzuzu";

// DOM Elements
const searchButton = document.getElementById("search-button");
const weatherForm = document.getElementById("search-form");
const cityInput = document.getElementById("search-box");
const errorMessage = document.getElementById("error-message");

// Event Listeners
weatherForm.addEventListener("submit", handleSearch);

// Function to initialize the app
async function init() {

    try {

        await loadWeather(currentCity);

    } catch (error) {

        displayErrorMessage(message);


    }

}

// LOAD WEATHER DATA
async function loadWeather(cityName) {

    const weather = await getWeather(cityName);

    displayWeather(weather);

}

// HANDLE LOADING STATE
function setLoadingState(isLoading) {

    if (isLoading) {

        searchButton.textContent = "Searching...";
        searchButton.disabled = true;

    } else {

        searchButton.textContent = "Search";
        searchButton.disabled = false;

    }

}

// HANDLE ERROR MESSAGE
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}

function hideError() {
    errorMessage.textContent = "";
    errorMessage.style.display = "none";
}

// HANDLE SEARCH
async function handleSearch(event) {

    event.preventDefault();

    const cityName = cityInput.value.trim();

    if (!cityName) {

        showError("Please enter a place name.");

        return;

    }

    if (cityName.toLowerCase() === currentCity.toLowerCase()) {

        cityInput.value = "";

        cityInput.focus();

        return;

    }

    setLoadingState(true);
    hideError();

    try {

        await loadWeather(cityName);

        currentCity = cityName;

        cityInput.value = "";

        cityInput.focus();

    } catch (error) {

        showError("Place not found. Please enter a valid place name.");

    } finally {

        setLoadingState(false);

}
}

// Start
init();