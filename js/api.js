const API_KEY = "7f0bcbdba3e7434da2a124045261907"; // recommended: remove the api key to env variable
const BASE_URL = "https://api.weatherapi.com/v1/current.json";

export async function getWeather(city) {
  const response = await fetch(
    `${BASE_URL}?key=${API_KEY}&q=${city}&aqi=no`
  );
  
  if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }


  const data = await response.json();

  return data;
}
