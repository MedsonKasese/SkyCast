const NOTIFICATION_THRESHOLDS = {
  heavyRainChance: 70,
  strongWindKph: 50,
  highTemperatureC: 35,
  lowTemperatureC: 5,
};

function isAlertExpired(alert) {
  if (!alert?.expires) {
    return false;
  }

  const expirationTime = new Date(alert.expires).getTime();

  if (Number.isNaN(expirationTime)) {
    return false;
  }

  return expirationTime <= Date.now();
}

function shouldNotifyForAlert(alert) {
  if (!alert || isAlertExpired(alert)) {
    return false;
  }

  const severity = (alert.severity || "").toLowerCase();

  return ["severe", "moderate", "minor"].includes(severity);
}

function numericValue(value) {
  if ((typeof value !== "number" && typeof value !== "string") || (typeof value === "string" && !value.trim())) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundedAmount(value, digits = 1) {
  return Number(value.toFixed(digits)).toString();
}

function evaluateOfficialWeatherAlerts(weather) {
  const notifications = [];
  const alerts = weather?.alerts?.alert || [];

  alerts.forEach((alert) => {
    if (!shouldNotifyForAlert(alert)) {
      return;
    }

    notifications.push({
      type: "weather-alert",
      title: alert.headline || alert.event || "Weather Alert",
      message:
        alert.desc ||
        alert.note ||
        "Please stay alert and monitor local weather conditions.",
      severity: alert.severity || "Unknown",
      event: alert.event || "Weather Alert",
      effective: alert.effective || null,
      expires: alert.expires || null,
      location: weather.location?.name || "this location",
    });
  });

  return notifications;
}

function evaluateForecastConditions(weather, isFahrenheit) {
  const notifications = [];
  const forecastDays = weather?.forecast?.forecastday || [];
  const cityName = weather?.location?.name || "this location";
  const temperatureUnit = isFahrenheit ? "°F" : "°C";
  const windUnit = isFahrenheit ? "mph" : "km/h";
  const rainfallUnit = isFahrenheit ? "in" : "mm";

  forecastDays.forEach((forecastDay) => {
    const day = forecastDay?.day;
    if (!day) {
      return;
    }

    const forecastDate = forecastDay.date || null;
    const dateLabel = forecastDate || "an upcoming day";
    const rainChance = numericValue(day.daily_chance_of_rain);
    const rainfallMm = numericValue(day.totalprecip_mm);
    const rainfallIn = numericValue(day.totalprecip_in);
    const rainfall = isFahrenheit
      ? (rainfallIn ?? (rainfallMm === null ? null : rainfallMm / 25.4))
      : (rainfallMm ?? (rainfallIn === null ? null : rainfallIn * 25.4));
    const maxWindKph = numericValue(day.maxwind_kph);
    const maxWindMph = numericValue(day.maxwind_mph);
    const windKph = maxWindKph ?? (maxWindMph === null ? null : maxWindMph * 1.609344);
    const windAmount = isFahrenheit
      ? (maxWindMph ?? (windKph === null ? null : windKph / 1.609344))
      : windKph;
    const maxTemperatureC = numericValue(day.maxtemp_c);
    const maxTemperatureF = numericValue(day.maxtemp_f);
    const minTemperatureC = numericValue(day.mintemp_c);
    const minTemperatureF = numericValue(day.mintemp_f);
    const highC = maxTemperatureC ?? (maxTemperatureF === null ? null : (maxTemperatureF - 32) * 5 / 9);
    const lowC = minTemperatureC ?? (minTemperatureF === null ? null : (minTemperatureF - 32) * 5 / 9);
    const highAmount = isFahrenheit
      ? (maxTemperatureF ?? (maxTemperatureC === null ? null : maxTemperatureC * 9 / 5 + 32))
      : (maxTemperatureC ?? (maxTemperatureF === null ? null : (maxTemperatureF - 32) * 5 / 9));
    const lowAmount = isFahrenheit
      ? (minTemperatureF ?? (minTemperatureC === null ? null : minTemperatureC * 9 / 5 + 32))
      : (minTemperatureC ?? (minTemperatureF === null ? null : (minTemperatureF - 32) * 5 / 9));

    const common = {
      type: "weather-condition",
      severity: "Moderate",
      effective: null,
      expires: null,
      location: cityName,
      forecastDate,
      locationQuery: Number.isFinite(weather.location?.lat) && Number.isFinite(weather.location?.lon)
        ? `${weather.location.lat},${weather.location.lon}` : cityName,
    };

    if (
      rainChance !== null &&
      rainChance >= NOTIFICATION_THRESHOLDS.heavyRainChance &&
      rainChance <= 100
    ) {
      const rainfallDetail =
        rainfall !== null && rainfall >= 0
          ? ` Forecast rainfall: ${roundedAmount(rainfall)} ${rainfallUnit}.`
          : "";
      notifications.push({
        ...common,
        conditionKey: "rain",
        title: "Rain Likely",
        message: `${Math.round(rainChance)}% chance of rain in ${cityName} on ${dateLabel}.${rainfallDetail}`,
        // Retain the legacy identity; probability alone does not imply heavy rainfall.
        event: `Heavy Rain Expected (${dateLabel})`,
      });
    }

    if (windKph !== null && windKph >= NOTIFICATION_THRESHOLDS.strongWindKph) {
      notifications.push({
        ...common,
        conditionKey: "wind",
        title: "Strong Winds Expected",
        message: `Winds may reach ${Math.round(windAmount)} ${windUnit} in ${cityName} on ${dateLabel}.`,
        event: `Strong Winds Expected (${dateLabel})`,
      });
    }

    if (highC !== null && highC >= NOTIFICATION_THRESHOLDS.highTemperatureC) {
      notifications.push({
        ...common,
        conditionKey: "high-temperature",
        title: "High Temperature Expected",
        message: `Temperatures may reach ${Math.round(highAmount)}${temperatureUnit} in ${cityName} on ${dateLabel}.`,
        event: `High Temperature Expected (${dateLabel})`,
      });
    }

    if (lowC !== null && lowC <= NOTIFICATION_THRESHOLDS.lowTemperatureC) {
      notifications.push({
        ...common,
        conditionKey: "low-temperature",
        title: "Low Temperature Expected",
        message: `Temperatures may fall to ${Math.round(lowAmount)}${temperatureUnit} in ${cityName} on ${dateLabel}.`,
        event: `Low Temperature Expected (${dateLabel})`,
      });
    }
  });

  return notifications;
}

export function evaluateWeatherNotifications(weather, isFahrenheit = false) {
  return [
    ...evaluateOfficialWeatherAlerts(weather),
    ...evaluateForecastConditions(weather, isFahrenheit),
  ];
}

export { NOTIFICATION_THRESHOLDS };
