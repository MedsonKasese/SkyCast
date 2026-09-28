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
  const sportName =
    event.sport.charAt(0).toUpperCase() +
    event.sport.slice(1);

  return {
    id: createSportsNotificationId(event.sport, event),
    type: "sports-event",
    title: `${sportIcon} ${sportName} event coming up`,
    message: `${event.match} starts soon.`,
    event: event.tournament || sportName,
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

export function evaluateSportsNotifications(sportsData) {
  const now = Date.now();

  return getSportEvents(sportsData)
    .filter((event) => {
      if (!event.start) {
        return false;
      }

      const startTime = new Date(event.start.replace(" ", "T")).getTime();

      if (Number.isNaN(startTime)) {
        return false;
      }

      const timeUntilStart = startTime - now;

      return (
        timeUntilStart > 0 &&
        timeUntilStart <= SPORTS_NOTIFICATION_WINDOW
      );
    })
    .map((event) => createSportsNotification(event));
}
