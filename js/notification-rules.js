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

function evaluateOfficialWeatherAlerts(weather) {
  const notifications = [];

  const alerts = weather.alerts?.alert || [];

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

function evaluateForecastConditions(weather) {
  const notifications = [];

  const forecastDays = weather.forecast?.forecastday || [];
  const cityName = weather.location?.name || "this location";

  forecastDays.forEach((forecastDay) => {
    const day = forecastDay.day;

    if (!day) {
      return;
    }

    const date = forecastDay.date || "upcoming day";

    const rainChance = Number(day.daily_chance_of_rain);
    const maxWindKph = Number(day.maxwind_kph);
    const maxTemperatureC = Number(day.maxtemp_c);
    const minTemperatureC = Number(day.mintemp_c);

    if (
      !Number.isNaN(rainChance) &&
      rainChance >= NOTIFICATION_THRESHOLDS.heavyRainChance
    ) {
      notifications.push({
        type: "weather-condition",
        title: "Heavy Rain Expected",
        message: `${rainChance}% chance of rain is expected in ${cityName} on ${date}.`,
        severity: "Moderate",
        event: `Heavy Rain Expected (${date})`,
        effective: null,
        expires: null,
        location: cityName,
      });
    }

    if (
      !Number.isNaN(maxWindKph) &&
      maxWindKph >= NOTIFICATION_THRESHOLDS.strongWindKph
    ) {
      notifications.push({
        type: "weather-condition",
        title: "Strong Winds Expected",
        message: `Winds may reach ${Math.round(maxWindKph)} km/h in ${cityName} on ${date}.`,
        severity: "Moderate",
        event: `Strong Winds Expected (${date})`,
        effective: null,
        expires: null,
        location: cityName,
      });
    }

    if (
      !Number.isNaN(maxTemperatureC) &&
      maxTemperatureC >= NOTIFICATION_THRESHOLDS.highTemperatureC
    ) {
      notifications.push({
        type: "weather-condition",
        title: "High Temperature Expected",
        message: `Temperatures may reach ${Math.round(maxTemperatureC)}°C in ${cityName} on ${date}.`,
        severity: "Moderate",
        event: `High Temperature Expected (${date})`,
        effective: null,
        expires: null,
        location: cityName,
      });
    }

    if (
      !Number.isNaN(minTemperatureC) &&
      minTemperatureC <= NOTIFICATION_THRESHOLDS.lowTemperatureC
    ) {
      notifications.push({
        type: "weather-condition",
        title: "Low Temperature Expected",
        message: `Temperatures may fall to ${Math.round(minTemperatureC)}°C in ${cityName} on ${date}.`,
        severity: "Moderate",
        event: `Low Temperature Expected (${date})`,
        effective: null,
        expires: null,
        location: cityName,
      });
    }
  });

  return notifications;
}

export function evaluateWeatherNotifications(weather) {
  return [
    ...evaluateOfficialWeatherAlerts(weather),
    ...evaluateForecastConditions(weather),
  ];
}

export { NOTIFICATION_THRESHOLDS };
