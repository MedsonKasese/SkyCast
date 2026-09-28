const LEAGUES = {
  basketball: { id: "4387", label: "NBA", sport: "basketball" },
  "american-football": { id: "4391", label: "NFL", sport: "american-football" },
  baseball: { id: "4424", label: "MLB", sport: "baseball" },
  "ice-hockey": { id: "4380", label: "NHL", sport: "ice-hockey" },
};

/**
 * Convert a TheSportsDB event into the event shape used by the sports feed.
 * The provider's strTime value is UTC, so keep the timestamp explicitly UTC.
 * @param {Object} event - Raw provider event, with optional schedule and venue fields.
 * @param {{label: string, sport: string}} league - League display name and sport key.
 * @returns {Object} Normalized event with fallback team and venue labels.
 */
function normalizeEvent(event, league) {
  const date = event.dateEvent || "";
  const time = event.strTime || "";
  const start = date && time ? `${date}T${time}Z` : "";

  return {
    match: `${event.strHomeTeam || "TBD"} vs ${event.strAwayTeam || "TBD"}`,
    tournament: league.label,
    start,
    stadium: event.strVenue || "Venue to be confirmed",
    country: event.strCountry || "",
    sport: league.sport,
  };
}

/**
 * Fetch upcoming events for a supported league and send a JSON response.
 * Unsupported leagues return 400; upstream HTTP errors retain their status;
 * fetch or parsing failures return 502.
 * @param {Object} req - Request with a sport key in query.league.
 * @param {Object} res - Serverless response exposing status() and json().
 * @returns {Promise<Object>} The response returned by res.json().
 */
export default async function handler(req, res) {
  const leagueKey = req.query.league;

  if (!Object.hasOwn(LEAGUES, leagueKey)) {
    return res.status(400).json({ error: "Unsupported league" });
  }

  const league = LEAGUES[leagueKey];

  try {
    // TheSportsDB's public test key supports these popular league schedules.
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.id}`,
    );
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "League schedule is unavailable" });
    }

    return res.status(200).json({
      league: league.label,
      events: (data.events || []).map((event) => normalizeEvent(event, league)),
    });
  } catch (error) {
    return res.status(502).json({ error: error.message || "League schedule is unavailable" });
  }
}
