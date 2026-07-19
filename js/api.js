const API_KEY = "7f0bcbdba3e7434da2a124045261907"; // Replace with your actual API key
const BASE_URL = "https://api.weatherapi.com/v1/current.json";

export async function getWeather(city) {
  const response = await fetch(
    `${BASE_URL}?key=${API_KEY}&q=${city}&aqi=no`
  );

  const data = await response.json();

  return data;
}