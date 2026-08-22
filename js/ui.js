export function displayLocation(weather) {
  const city = document.getElementById("city-name");

  city.textContent = `${weather.location.name}, ${weather.location.country}`;
}

export function displayDate(weather) {
  const dateElement = document.getElementById("current-date");

  const localDate = new Date(weather.location.localtime);
  const formattedDate = localDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  dateElement.textContent = formattedDate;
}

export function displayTemperature(weather) {
  const temperature = document.getElementById("temperature");

  temperature.textContent = `${Math.round(weather.current.temp_c)}°C`;
}

export function displayWeatherIcon(weather) {
  const weatherIcon = document.getElementById("weather-icon");
  weatherIcon.src = "https:" + weather.current.condition.icon;
}

export function displayCondition(weather) {
  const condition = document.getElementById("weather-condition");
  condition.textContent = weather.current.condition.text;
}

export function displayHumidity(weather) {
  const humidity = document.getElementById("humidity");
  humidity.textContent = `${weather.current.humidity}%`;
}

export function displayWindSpeed(weather) {
  const windSpeed = document.getElementById("wind-speed");
  windSpeed.textContent = `${weather.current.wind_kph} km/h`;
}

export function displayPrecipitation(weather) {
  const precipitation = document.getElementById("precipitation");
  precipitation.textContent = `${weather.current.precip_mm} mm`;
}

export function displayFeelsLike(weather) {
  const feelsLike = document.getElementById("feels-like");
  feelsLike.textContent = `${Math.round(weather.current.feelslike_c)}°C`;
}

// SUN TIMES LOGIC
export function displaySunTimes(weather) {
  const sunrise = document.getElementById("sunrise");
  const sunset = document.getElementById("sunset");

  const astro = weather.forecast?.forecastday?.[0]?.astro;

  if (!sunrise || !sunset || !astro) {
    return;
  }

  sunrise.textContent = astro.sunrise;
  sunset.textContent = astro.sunset;
}
// WEATHER ALERTS LOGIC
export function displayWeatherAlerts(weather) {
  const container = document.getElementById("weather-alerts-container");

  if (!container) {
    return;
  }

  const alerts = weather.alerts?.alert || [];
  const cityName = weather.location?.name || "this location";

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="weather-alert no-alerts">
        <span class="no-alerts-icon">🛡️</span>
        <p>No active weather alerts for ${cityName}.</p>
      </div>
    `;

    return;
  }

  // Active alerts will be rendered here
  container.innerHTML = alerts
    .map(
      (alert) => `
      <div class="weather-alert active-alert">
        <div class="alert-header">
          <span class="alert-icon">⚠️</span>
          <h3>${alert.headline || "Weather Alert"}</h3>
        </div>

        <p class="alert-description">
          ${alert.desc || alert.note || "Please stay alert and monitor local weather conditions."}
        </p>

        ${
          alert.expires
            ? `<p class="alert-expires">Expires: ${alert.expires}</p>`
            : ""
        }
      </div>
    `,
    )
    .join("");
}

function applyWeatherTheme(weather) {
  const body = document.body;

  // Remove old theme classes
  body.classList.remove(
    "theme-sunny",
    "theme-cloudy",
    "theme-rainy",
    "theme-snowy",
    "theme-night",
  );

  // Night takes priority
  if (weather.current.is_day === 0) {
    body.classList.add("theme-night");
    return;
  }

  const condition = weather.current.condition.text.toLowerCase();

  if (condition.includes("sunny") || condition.includes("clear")) {
    body.classList.add("theme-sunny");
  } else if (
    condition.includes("rain") ||
    condition.includes("drizzle") ||
    condition.includes("thunder")
  ) {
    body.classList.add("theme-rainy");
  } else if (
    condition.includes("snow") ||
    condition.includes("ice") ||
    condition.includes("sleet")
  ) {
    body.classList.add("theme-snowy");
  } else {
    body.classList.add("theme-cloudy");
  }
}

export function displayForecast(weather) {
  const container = document.getElementById("forecast-container");

  if (!container || !weather.forecast) return;

  container.innerHTML = "";

  weather.forecast.forecastday.forEach((day) => {
    // Skip today (index 0)
    //	if (index === 0) return;

    const date = new Date(day.date);
    const dayName = date.toLocaleDateString("en-US", {
      weekday: "short",
    });

    const card = document.createElement("div");
    card.className = "forecast-card";

    card.innerHTML = `
      <div class="forecast-day">${dayName}</div>
      <img
        class="forecast-icon"
        src="https:${day.day.condition.icon}"
        alt="${day.day.condition.text}"
      />
      <div class="forecast-temp">
        ${Math.round(day.day.maxtemp_c)}° / ${Math.round(day.day.mintemp_c)}°
      </div>
      <div class="forecast-condition">
        ${day.day.condition.text}
      </div>
			
			  <div class="forecast-rain">
      🌧 ${day.day.daily_chance_of_rain}%
     </div>
    `;

    container.appendChild(card);
  });
}

export function displayHourlyForecast(weather) {
  const container = document.getElementById("hourly-container");
  if (!container || !weather.forecast) return;

  container.innerHTML = "";

  // Get current time to filter out past hours
  const currentEpoch = Math.floor(Date.now() / 1000);

  // Combine hours from today and tomorrow to ensure we have a full 24h window
  const allHours = [
    ...weather.forecast.forecastday[0].hour,
    ...(weather.forecast.forecastday[1]
      ? weather.forecast.forecastday[1].hour
      : []),
  ];

  // Filter to get only future hours and limit to 24 items
  const next24Hours = allHours
    .filter((hour) => hour.time_epoch > currentEpoch)
    .slice(0, 7);

  next24Hours.forEach((hour) => {
    const time = new Date(hour.time).toLocaleTimeString("en-US", {
      hour: "numeric",
      hour12: true,
    });

    const card = document.createElement("div");
    card.className = "forecast-card";

    card.innerHTML = `
            <div class="forecast-day">${time}</div>
            <img
                class="forecast-icon"
                src="https:${hour.condition.icon}"
                alt="${hour.condition.text}"
            />
            <div class="forecast-temp">
                ${Math.round(hour.temp_c)}°
            </div>
            <div class="forecast-condition">
                ${hour.condition.text}
            </div>
        `;

    container.appendChild(card);
  });
}

export function displayWeather(weather) {
  displayHourlyForecast(weather);
  displayForecast(weather);
  applyWeatherTheme(weather);
  displayLocation(weather);
  displayDate(weather);
  displayTemperature(weather);
  displayWeatherIcon(weather);
  displayCondition(weather);
  displayHumidity(weather);
  displayWindSpeed(weather);
  displayPrecipitation(weather);
  displayFeelsLike(weather);
  displaySunTimes(weather);
  displayWeatherAlerts(weather);
}
