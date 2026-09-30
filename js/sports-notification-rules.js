const SPORTS_NOTIFICATION_WINDOW = 24 * 60 * 60 * 1000;
const SPORT_ICONS = {
  football: "⚽",
  cricket: "🏏",
  golf: "⛳",
  basketball: "🏀",
  "american-football": "🏈",
  baseball: "⚾",
  "ice-hockey": "🏒",
};

const SPORT_NAMES = {
  football: "Football",
  cricket: "Cricket",
  golf: "Golf",
  basketball: "NBA",
  "american-football": "NFL",
  baseball: "MLB",
  "ice-hockey": "NHL",
};

function createSportsNotificationId(sport, event) {
  const eventKey = `${sport}-${event.match}-${event.start}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `sports-${eventKey}`;
}

/**
 * Flatten sport event groups, tagging each event with its group's sport key.
 * @param {Object<string, Object[]>} [sportsData] - Events grouped by sport key.
 * @returns {Object[]} Copied events with a sport field, or an empty list if absent.
 */
function getSportEvents(sportsData) {
  const sports = Object.keys(sportsData || {});

  return sports.flatMap((sport) =>
    (sportsData?.[sport] || []).map((event) => ({
      ...event,
      sport,
    })),
  );
}

function createSportsNotification(event) {
  const sportIcon = SPORT_ICONS[event.sport] || "🏅";
  const sportName = SPORT_NAMES[event.sport] || "Sports";
  const matchName = event.match || "Upcoming event";
  const tournamentName = event.tournament || "Scheduled event";

  return {
    id: createSportsNotificationId(event.sport, event),
    type: "sports-event",
    title: `${sportIcon} ${sportName}: ${matchName}`,
    message: `${matchName} starts soon.`,
    event: `${sportName} · ${tournamentName}`,
    read: false,
    createdAt: Date.now(),
    sportsEvent: {
      sport: event.sport,
      match: event.match,
      start: event.start,
      stadium: event.stadium || "",
      country: event.country || "",
      region: event.region || "",
      tournament: event.tournament || "",
    },
  };
}

/**
 * Create unread alerts for events starting after now and within 24 hours,
 * including events exactly 24 hours away. Skip missing or invalid start dates.
 * @param {Object<string, Object[]>} [sportsData] - Events grouped by sport key.
 * @returns {Object[]} Alerts with event details and creation times in epoch
 * milliseconds; an empty list when no events qualify. Does not persist alerts.
 */
export function evaluateSportsNotifications(sportsData, windowMs = SPORTS_NOTIFICATION_WINDOW) {
  const now = Date.now();

  return getSportEvents(sportsData)
    .filter((event) => {
      if (!event.start) {
        return false;
      }

      const startTime = new Date(event.start).getTime();

      if (Number.isNaN(startTime)) {
        return false;
      }

      const timeUntilStart = startTime - now;

      return (
        timeUntilStart > 0 &&
        timeUntilStart <= windowMs
      );
    })
    .map((event) => createSportsNotification(event));
}
