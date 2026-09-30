import { evaluateWeatherNotifications } from "./notification-rules.js";
import { evaluateSportsNotifications } from "./sports-notification-rules.js";
import { getSettings } from "./settings.js";

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

/**
 * Replace the notifications in local storage.
 * @param {Object[]} notifications - Complete notification list to persist.
 * @returns {boolean} False if serialization or storage fails; true otherwise.
 */
function saveNotifications(notifications) {
  try {
    localStorage.setItem(
      NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications),
    );
    return true;
  } catch (error) {
    console.error("Failed to save notifications:", error);
    return false;
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

/**
 * Refresh stored sports alerts using the enabled sports preferences.
 * Preserve matching alerts' read state and all non-sports notifications,
 * deduplicate by ID, and attempt to persist the merged list. Sports alerts
 * outside the next 24 hours or for disabled sports are removed.
 * @param {Object<string, Object[]>} sportsData - Events grouped by sport key.
 * @returns {Object[]} The merged notification list, even if persistence fails.
 */
export function syncSportsNotifications(sportsData) {
  const enabledSports = getSettings().sportsUpdates;
  const favoriteTeams = getSettings().favoriteTeams || [];
  const evaluatedNotifications = evaluateSportsNotifications(sportsData)
    .filter((notification) =>
      enabledSports.includes(notification.sportsEvent.sport),
    )
    .filter((notification) =>
      matchesFavoriteTeam(notification.sportsEvent?.match, favoriteTeams),
    );

  const existingNotifications = getStoredNotifications();

  const existingSportsNotifications = new Map(
    existingNotifications
      .filter((notification) => notification.type === "sports-event")
      .map((notification) => [notification.id, notification]),
  );

  const sportsNotifications = evaluatedNotifications.map((notification) => {
    const existing = existingSportsNotifications.get(notification.id);

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
    (notification) => notification.type !== "sports-event",
  );

  const uniqueNotifications = new Map();

  [...otherNotifications, ...sportsNotifications].forEach(
    (notification) => {
      uniqueNotifications.set(notification.id, notification);
    },
  );

  const notifications = [...uniqueNotifications.values()];

  saveNotifications(notifications);

  return notifications;
}

/**
 * Remove persisted sports alerts for sports that are no longer enabled.
 * This is called immediately after settings are saved so disabled sports
 * disappear from the notification center without waiting for a sports refresh.
 * @param {string[]} enabledSports - Sport keys currently enabled in settings.
 * @param {string[]} [favoriteTeams=[]] - Optional team names to keep alerts for.
 * @returns {boolean} True when the filtered list was persisted successfully.
 */
export function removeDisabledSportsNotifications(enabledSports, favoriteTeams = []) {
  const enabled = new Set(enabledSports);
  const notifications = getStoredNotifications().filter((notification) => {
    if (notification.type !== "sports-event") return true;
    if (!enabled.has(notification.sportsEvent?.sport)) return false;
    return matchesFavoriteTeam(notification.sportsEvent?.match, favoriteTeams);
  });

  return saveNotifications(notifications);
}

function matchesFavoriteTeam(match, favoriteTeams = []) {
  if (!favoriteTeams.length) return true;
  const normalizedMatch = String(match || "").toLocaleLowerCase();
  return favoriteTeams.some((team) =>
    normalizedMatch.includes(String(team).toLocaleLowerCase()),
  );
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

/**
 * Remove all stored notifications, suppressing storage errors.
 * @returns {void}
 */
export function clearNotifications() {
  try {
    localStorage.removeItem(NOTIFICATIONS_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear notifications:", error);
  }
}
