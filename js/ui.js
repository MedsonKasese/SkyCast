
export function displayLocation(weather){

    const city = document.getElementById("city-name");

    city.textContent =
        `${weather.location.name}, ${weather.location.country}`;

}

export function displayDate(weather){

    const dateElement = document.getElementById("current-date");

    const localDate = new Date(weather.location.localtime);
    const formattedDate = localDate.toLocaleDateString("en-US",{
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    dateElement.textContent = formattedDate;
}

export function displayTemperature(weather){

    const temperature = document.getElementById("temperature");

    temperature.textContent = `${Math.round(weather.current.temp_c)}°C`;

}

export function displayWeatherIcon(weather){

    const weatherIcon = document.getElementById("weather-icon");
    weatherIcon.src = "https:" + weather.current.condition.icon;
}

export function displayCondition(weather){

    const condition = document.getElementById("weather-condition");
    condition.textContent = weather.current.condition.text;

}

export function displayHumidity(weather){
    const humidity = document.getElementById("humidity");
    humidity.textContent = `${weather.current.humidity}%`;
}

export function displayWindSpeed(weather){
    const windSpeed = document.getElementById("wind-speed");
    windSpeed.textContent = `${weather.current.wind_kph} km/h`;
}

export function displayPrecipitation(weather){
    const precipitation = document.getElementById("precipitation");
    precipitation.textContent = `${weather.current.precip_mm} mm`;
}

export function displayFeelsLike(weather){
    const feelsLike = document.getElementById("feels-like");
    feelsLike.textContent = `${Math.round(weather.current.feelslike_c)}°C`;
}

export function displayWeather(weather) {

    displayLocation(weather);
    displayDate(weather);
    displayTemperature(weather);
    displayWeatherIcon(weather);
    displayCondition(weather);
    displayHumidity(weather);
    displayWindSpeed(weather);
    displayPrecipitation(weather);
    displayFeelsLike(weather);

}