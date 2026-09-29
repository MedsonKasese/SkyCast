import { getLeagueEvents, getSports } from "./api.js";
import { escapeHtml } from "./utils.js";
import { syncSportsNotifications } from "./notifications.js";
import { applyTheme, getSettings } from "./settings.js";

const LEAGUE_SPORTS = ["basketball", "american-football", "baseball", "ice-hockey"];
let sportsData = { football: [], cricket: [], golf: [] };
let activeSport = "all";
let sportsFiltersInitialized = false;
let currentSportsRequestId = 0;
const leagueRequestIds = new Map();

/**
 * Load local events, initialize filters, sync alerts, and render the sports feed.
 * League data is kept when the location-dependent local feed is refreshed.
 * Ignore superseded local responses; load missing leagues when All is active.
 * Local request failures display an error while retaining cached events.
 * @param {string} location - Location query passed to the sports API.
 * @returns {Promise<void>} Resolves after loading or displaying an error.
 * @throws {Error} If theme/filter setup or notification/render recovery fails.
 */
export async function loadSports(location) {
  const requestId = ++currentSportsRequestId;
  if (!document.getElementById("sports-container")) return;

  applyTheme();

  if (!sportsFiltersInitialized) {
    setupSportsFilters();
    sportsFiltersInitialized = true;
  }

  if (!location) {
    return displaySportsMessage("Unable to load sports without a location.");
  }

  displaySportsMessage("Loading sports events...");

  try {
    const data = await getSports(location);
    if (requestId !== currentSportsRequestId) return;

    sportsData = {
      ...sportsData,
      football: data.football || [],
      cricket: data.cricket || [],
      golf: data.golf || [],
    };

    syncSportsNotifications(sportsData);
    renderSports();

    if (activeSport === "all") {
      await loadAllLeagueSchedules();
    }
  } catch (error) {
    if (requestId === currentSportsRequestId) {
      syncSportsNotifications(sportsData);
      renderSports();
      displaySportsMessage(
        error.message || "Unable to load sports events.",
      );
    }
  }
}

/**
 * Fetch and cache an unloaded league schedule.
 * Ignore a response if a newer request for the same league has started.
 * Cache empty schedules too, sync alerts, and render for the active feed.
 * Request failures are caught and shown only for the latest request when
 * this sport is selected; failed requests remain eligible for retry.
 * @param {string} sport - Supported league sport key.
 * @returns {Promise<void>} Resolves after the schedule is handled.
 */
async function loadLeagueSchedule(sport) {
  if (sportsData[sport]) {
    renderSports();
    return;
  }

  const requestId = (leagueRequestIds.get(sport) || 0) + 1;
  leagueRequestIds.set(sport, requestId);
  displaySportsMessage(`Loading ${formatSportName(sport)} schedule...`);

  try {
    const data = await getLeagueEvents(sport);

    if (requestId !== leagueRequestIds.get(sport)) return;

    sportsData[sport] = data.events || [];
    syncSportsNotifications(sportsData);

    if (activeSport === sport || activeSport === "all") {
      renderSports();
    }
  } catch (error) {
    if (requestId === leagueRequestIds.get(sport) && activeSport === sport) {
      displaySportsMessage(
        error.message || "Unable to load league schedule.",
      );
    }
  }
}

/**
 * Load every supported league that is not already cached.
 * A failed league does not prevent other leagues from rendering.
 * @returns {Promise<void>} Resolves after all league requests settle.
 * @throws {Error} If notification synchronization or rendering fails afterward.
 */
async function loadAllLeagueSchedules() {
  const missingLeagues = LEAGUE_SPORTS.filter(
    (sport) => !sportsData[sport],
  );

  if (!missingLeagues.length) {
    return;
  }

  await Promise.allSettled(
    missingLeagues.map((sport) => loadLeagueSchedule(sport)),
  );

  syncSportsNotifications(sportsData);

  if (activeSport === "all") {
    renderSports();
  }
}

/**
 * Render filtered events into the sports container, or show an empty-state message.
 * Show all events on sports.html and at most three on other pages.
 * @returns {void}
 */
function renderSports() {
  const sportsContainer = document.getElementById("sports-container");
  if (!sportsContainer) return;

  const events = getFilteredEvents();
  const visibleEvents = window.location.pathname.endsWith("sports.html")
    ? events
    : events.slice(0, 3);

  if (!events.length) {
    return displaySportsMessage("No upcoming sports events found.");
  }

  sportsContainer.innerHTML = visibleEvents.map(createSportsCard).join("");
}

/**
 * Select cached events for the active sport, or every sport when All is active.
 * Sort by parsed start time, treating missing starts as the Unix epoch;
 * invalid dates have no guaranteed chronological position.
 * @returns {Object[]} Copied events tagged with their sport, sorted by start time.
 */
function getFilteredEvents() {
  const events = activeSport === "all"
    ? Object.entries(sportsData).flatMap(([sport, items]) =>
        items.map((event) => ({ ...event, sport })),
      )
    : (sportsData[activeSport] || []).map((event) => ({
        ...event,
        sport: activeSport,
      }));

  return events.sort(
    (a, b) => new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime(),
  );
}

/**
 * Build a sports card with escaped event details and localized date/time.
 * @param {Object} event - Event containing sport, start, match, and venue details.
 * @returns {string} HTML markup for one sports card.
 */
function createSportsCard(event) {
  const { date, time } = formatEventDate(event.start);
  const favoriteTeams = getSettings().favoriteTeams || [];
  const isFavoriteMatch = matchesFavoriteTeam(event.match, favoriteTeams);
  const favoriteBadge = isFavoriteMatch && favoriteTeams.length
    ? '<span class="sports-favorite-badge"><i class="fa-solid fa-star" aria-hidden="true"></i> Favorite team</span>'
    : "";

  return `<article class="sports-card ${favoriteBadge ? "sports-card-favorite" : ""}">
    <div class="sports-card-header"><span class="sports-type">${formatSportName(event.sport)}</span><span class="sports-tournament">${escapeHtml(event.tournament || "League event")}</span></div>
    ${favoriteBadge}
    <h3 class="sports-match">${escapeHtml(event.match || "Match to be confirmed")}</h3>
    <div class="sports-meta"><span><i class="fa-regular fa-calendar-days" aria-hidden="true"></i>${date}</span><span><i class="fa-regular fa-clock" aria-hidden="true"></i>${time}</span></div>
    <div class="sports-location"><span aria-hidden="true">📍</span><span>${escapeHtml(event.stadium || "Venue to be confirmed")}</span></div>
    <div class="sports-country"><span aria-hidden="true">🌍</span><span>${escapeHtml(event.country || "Location to be confirmed")}</span></div>
  </article>`;
}

/**
 * Attach filter handlers independently of the local sports API.
 * Selecting All renders cached events immediately, then loads missing leagues.
 * @returns {void}
 */
function setupSportsFilters() {
  document.querySelectorAll(".sports-filter").forEach((filter) => {
    filter.addEventListener("click", async () => {
      activeSport = filter.dataset.sport;

      document.querySelectorAll(".sports-filter").forEach((button) => {
        const isActive = button === filter;
        button.classList.toggle("active", isActive);
        button.setAttribute("aria-selected", String(isActive));
      });

      if (activeSport === "all") {
        renderSports();
        await loadAllLeagueSchedules();
      } else if (LEAGUE_SPORTS.includes(activeSport)) {
        await loadLeagueSchedule(activeSport);
      } else {
        renderSports();
      }
    });
  });
}

/**
 * Replace the sports container contents with an escaped status message, if present.
 * @param {string} message - Loading, empty-state, or error text to display.
 * @returns {void}
 */
function displaySportsMessage(message) {
  const sportsContainer = document.getElementById("sports-container");
  if (sportsContainer) {
    sportsContainer.innerHTML =
      `<p class="sports-message">${escapeHtml(message)}</p>`;
  }
}

/**
 * Check whether an event name contains one of the user's favorite team names.
 * Matching is case-insensitive. An empty favorites list matches no badges.
 * @param {string} match - Event or match name.
 * @param {string[]} favoriteTeams - Saved team names.
 * @returns {boolean} Whether the event includes a favorite team.
 */
function matchesFavoriteTeam(match, favoriteTeams = []) {
  if (!favoriteTeams.length) return false;
  const normalizedMatch = String(match || "").toLocaleLowerCase();
  return favoriteTeams.some((team) =>
    normalizedMatch.includes(String(team).toLocaleLowerCase()),
  );
}

function formatSportName(sport) {
  return {
    football: "Football",
    cricket: "Cricket",
    golf: "Golf",
    basketball: "NBA",
    "american-football": "NFL",
    baseball: "MLB",
    "ice-hockey": "NHL",
  }[sport] || "Sports";
}

/**
 * Format an ISO timestamp in the user's local timezone.
 * Missing or invalid timestamps return Date unavailable and Time unavailable.
 * @param {string} dateTime - ISO timestamp, preferably with an explicit timezone.
 * @returns {{date: string, time: string}} Localized display date and time.
 */
function formatEventDate(dateTime) {
  if (!dateTime) {
    return { date: "Date unavailable", time: "Time unavailable" };
  }

  const dateObject = new Date(dateTime);

  if (Number.isNaN(dateObject.getTime())) {
    return { date: "Date unavailable", time: "Time unavailable" };
  }

  return {
    date: dateObject.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: dateObject.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}
