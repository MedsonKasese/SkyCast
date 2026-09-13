import { evaluateWeatherNotifications } from "./notification-rules.js";

const NOTIFICATIONS_STORAGE_KEY = "skycast-notifications";

function getStoredNotifications() {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const notifications = JSON.parse(stored);

    return Array.isArray(notifications) ? notifications : [];
  } catch (error) {
    console.error("Failed to read notifications:", error);
    return [];
  }
}

function saveNotifications(notifications) {
  try {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications),
    );
  } catch (error) {
    console.error("Failed to save notifications:", error);
  }
}

function createWeatherAlertId(alert, cityName) {
  const rawId = [
    "weather-alert",
    cityName,
    alert.event || "",
    alert.headline || "",
    alert.effective || "",
    alert.expires || "",
  ].join("|");

  let hash = 0;

  for (let index = 0; index < rawId.length; index++) {
    hash = (hash << 5) - hash + rawId.charCodeAt(index);
    hash |= 0;
  }

  return `weather-${Math.abs(hash)}`;
}

function normalizeWeatherAlert(alert, cityName) {
  return {
    id: createWeatherAlertId(alert, cityName),
    type: alert.type || "weather-alert",
    title: alert.headline || alert.event || "Weather Alert",
    message:
      alert.desc ||
      alert.note ||
      "Please stay alert and monitor local weather conditions.",
    severity: alert.severity || "Unknown",
    event: alert.event || "Weather Alert",
    effective: alert.effective || null,
    expires: alert.expires || null,
    location: cityName,
    read: false,
  };
}

export function syncWeatherNotifications(weather) {
  const cityName = weather.location?.name || "this location";

  const evaluatedNotifications = evaluateWeatherNotifications(weather);

  // Remove duplicate notifications generated from duplicate API records.
  const uniqueEvaluatedNotifications = new Map();

  evaluatedNotifications.forEach((notification) => {
  const normalizedNotification = normalizeWeatherAlert(
    notification,
    cityName,
  );

  uniqueEvaluatedNotifications.set(
    normalizedNotification.id,
    normalizedNotification,
  );
});

  const existingNotifications = getStoredNotifications();

  const existingWeatherNotifications = new Map(
    existingNotifications
      .filter(
        (notification) =>
          notification.type === "weather-alert" ||
          notification.type === "weather-condition",
      )
      .map((notification) => [notification.id, notification]),
  );

  const weatherNotifications = [
    ...uniqueEvaluatedNotifications.values(),
  ].map((notification) => {
    const existing = existingWeatherNotifications.get(notification.id);

    if (existing) {
      return {
        ...notification,
        read: existing.read,
      };
    }

    return {
      ...notification,
      read: false,
    };
  });

  const otherNotifications = existingNotifications.filter(
    (notification) =>
      notification.type !== "weather-alert" &&
      notification.type !== "weather-condition",
  );

  // Final safety net: make sure no duplicate notification IDs
  // can ever be stored.
  const uniqueNotifications = new Map();

  [...weatherNotifications, ...otherNotifications].forEach(
    (notification) => {
      uniqueNotifications.set(notification.id, notification);
    },
  );

  const notifications = [...uniqueNotifications.values()];

  saveNotifications(notifications);

  return notifications;
}

export function getNotifications() {
  return getStoredNotifications();
}

export function getUnreadNotificationCount() {
  return getStoredNotifications().filter(
    (notification) => !notification.read,
  ).length;
}

export function markNotificationAsRead(notificationId) {
  const notifications = getStoredNotifications().map((notification) => {
    if (notification.id !== notificationId) {
      return notification;
    }

    return {
      ...notification,
      read: true,
    };
  });

  saveNotifications(notifications);

  return notifications;
}

export function markAllNotificationsAsRead() {
  const notifications = getStoredNotifications().map((notification) => ({
    ...notification,
    read: true,
  }));

  saveNotifications(notifications);

  return notifications;
}

export function clearNotifications() {
  localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
}
