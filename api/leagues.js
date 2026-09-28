const LEAGUES = {
  basketball: { id: "4387", label: "NBA", sport: "basketball" },
  "american-football": { id: "4391", label: "NFL", sport: "american-football" },
  baseball: { id: "4424", label: "MLB", sport: "baseball" },
  "ice-hockey": { id: "4380", label: "NHL", sport: "ice-hockey" },
};

function normalizeEvent(event, league) {
  return {
    match: `${event.strHomeTeam || "TBD"} vs ${event.strAwayTeam || "TBD"}`,
    tournament: league.label,
    start: `${event.dateEvent || ""} ${event.strTime || ""}`.trim(),
    stadium: event.strVenue || "Venue to be confirmed",
    country: event.strCountry || "",
    sport: league.sport,
  };
}

export default async function handler(req, res) {
  const league = LEAGUES[req.query.league];

  if (!league) {
    return res.status(400).json({ error: "Unsupported league" });
  }

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
