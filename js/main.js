// Imports
import { getWeather } from "./api.js";
import { displayWeather } from "./ui.js";

// Global Variables
let currentCity = "mzuzu";

// DOM Elements
const searchButton = document.getElementById("search-button");
const weatherForm = document.getElementById("search-form");
const cityInput = document.getElementById("search-box");
const currentLocationButton = document.getElementById("current-location-button");
const errorMessage = document.getElementById("error-message");

// Event Listeners
weatherForm.addEventListener("submit", handleSearch);
currentLocationButton.addEventListener("click", getCurrentLocation);

// Function to initialize the app
async function init() {

    try {

        await loadWeather(currentCity);

    } catch (error) {

        showError("place not found");


    }

}

// LOAD WEATHER DATA
async function loadWeather(cityName) {

    const weather = await getWeather(cityName);

    displayWeather(weather);

}

// HANDLE LOADING STATE
function setLoadingState(button, isLoading, loadingText ) {

    if (isLoading) {
        button.dataset.originalText = button.textContent;
        button.textContent = loadingText;
        button.disabled = true;

    } else {
        const originalText =  button.dataset.originalText; 
        button.textContent = originalText;
        button.disabled = false;

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

    setLoadingState(searchButton, true , "Searching...");
    hideError();

    try {

        await loadWeather(cityName);

        currentCity = cityName;

        cityInput.value = "";

        cityInput.focus();

    } catch (error) {

        showError("Place not found. Please enter a valid place name.");

    } finally {

        setLoadingState(searchButton, false);

}
}


//HANDLE CURRENT POSITION 
async function handleCurretPosition(position) {
  const latitude = position.coords.latitude;
  const longitude = position.coords.longitude;
  const coordinates = `${latitude},${longitude}`;

  try {
    const weather = await getWeather(coordinates);
    displayWeather(weather);
  } catch (error) {
    showError("Unable to retrieve weather data for your current location. please check your location permissions or internet connection.");
  }finally {
    setLoadingState(currentLocationButton, false);
  }

    // console.log( "latitude: " + latitude);
     //console.log("longitude: " + longitude);
}

function getCurrentLocation() {
  hideError();
   setLoadingState(
    currentLocationButton,
    true,
    "Getting Location...");

  navigator.geolocation.getCurrentPosition(
    handleCurretPosition,
    handleLocationError);
 
}

function handleLocationError(error){
  setLoadingState(currentLocationButton,false);
  // FRIENDLY EEROR MESSEGES
  switch (error.code) {
    case error.PERMISSION_DENIED:
      showError("Location permission denied. Please allow location access in your browser settings.")
      
      break;
    case error.POSITION_UNAVAILABLE:
      showError("Your device couldn't determine your location");
      break;
    case error.TIMEOUT:
      showError("Location request timed out. Please try again");
      break;
  
    default:
      showError("Unable to retrieve your location.")
      break;
  }
 console.log(error);
}
if ("serviceWorker" in navigator){
   window.addEventListener("load",()=>{
    navigator.serviceWorker
     .register("/sw.js")
     .then(() => {
      console.log("service Worker registered ");
     })
     .catch(console.error);

   });
}
// Start
init();