import { getWeather } from "./api.js";
import { displayWeather } from "./ui.js";

async function init() {

    try {

        const weather = await getWeather("mzuzu");


        displayWeather(weather);

    } catch(error){
       alert("Place not found. Please try again.");

        console.error(error);

    }

}

let currentCity = "Berlin";

async function handleSearch(event) {
  event.preventDefault();

  const cityInput = document.getElementById("search-box");

  const cityName = cityInput.value.trim();
  if (cityName.toLowerCase() === currentCity.toLowerCase()) {

    cityInput.value = "";

    cityInput.focus();

    return;

}



  if (!cityName) {
    alert("Please enter a place name.");
    return;
}

}

const weatherForm = document.getElementById('search-form');

weatherForm.addEventListener('submit', handleSearch);

init();