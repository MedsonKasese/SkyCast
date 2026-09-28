import { getLeagueEvents, getSports } from "./api.js";
import { escapeHtml } from "./utils.js";
import { syncSportsNotifications } from "./notifications.js";
import { applyTheme } from "./settings.js";

const LEAGUE_SPORTS = ["basketball", "american-football", "baseball", "ice-hockey"];
let sportsData = { football: [], cricket: [], golf: [] };
let activeSport = "all";
let sportsFiltersInitialized = false;
let currentSportsRequestId = 0;

/**
 * Load local events, sync alerts, initialize filters, and render the sports feed.
 * Ignore superseded requests and show loading or error messages in the container.
 * @param {string} location - Location query passed to the sports API.
 * @returns {Promise<void>} Resolves after loading or displaying an error.
 */
export async function loadSports(location) {
  const requestId = ++currentSportsRequestId;
  if (!document.getElementById("sports-container")) return;

  applyTheme();
  if (!location) return displaySportsMessage("Unable to load sports without a location.");
  displaySportsMessage("Loading sports events...");

  try {
    const data = await getSports(location);
    if (requestId !== currentSportsRequestId) return;

    sportsData = {
      football: data.football || [],
      cricket: data.cricket || [],
      golf: data.golf || [],
    };
    syncSportsNotifications(sportsData);
    if (!sportsFiltersInitialized) {
      setupSportsFilters();
      sportsFiltersInitialized = true;
    }
    renderSports();
  } catch (error) {
    if (requestId === currentSportsRequestId) displaySportsMessage(error.message || "Unable to load sports events.");
  }
}

/**
 * Fetch and cache an unloaded league schedule, then sync alerts and render it.
 * Cached schedules return immediately; request failures display a message.
 * @param {string} sport - Supported league sport key.
 * @returns {Promise<void>} Resolves after the schedule is handled.
 */
async function loadLeagueSchedule(sport) {
  if (sportsData[sport]) return;
  displaySportsMessage(`Loading ${formatSportName(sport)} schedule...`);

  try {
    const data = await getLeagueEvents(sport);
    sportsData[sport] = data.events || [];
    syncSportsNotifications(sportsData);
    renderSports();
  } catch (error) {
    displaySportsMessage(error.message || "Unable to load league schedule.");
  }
}

/**
 * Render filtered events into the sports container, or show an empty-state message.
 * Show all events on sports.html and at most three on other pages.
 * @returns {void}
 */
function renderSports() {
  const sportsContainer = document.getElementById("sports-container");
  const events = getFilteredEvents();
  const visibleEvents = window.location.pathname.endsWith("sports.html") ? events : events.slice(0, 3);

  if (!events.length) return displaySportsMessage("No upcoming sports events found.");
  sportsContainer.innerHTML = visibleEvents.map(createSportsCard).join("");
}

/**
 * Select cached events for the active sport and sort by their start strings.
 * @returns {Object[]} Copied events tagged with their sport, in ascending order.
 */
function getFilteredEvents() {
  const events = activeSport === "all"
    ? Object.entries(sportsData).flatMap(([sport, items]) => items.map((event) => ({ ...event, sport })))
    : (sportsData[activeSport] || []).map((event) => ({ ...event, sport: activeSport }));
  return events.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
}

/**
 * Build a sports card with escaped event details and labels for missing fields.
 * @param {Object} event - Event containing sport, start, match, and venue details.
 * @returns {string} HTML markup for one sports card.
 */
function createSportsCard(event) {
  const { date, time } = formatEventDate(event.start);
  return `<article class="sports-card">
    <div class="sports-card-header"><span class="sports-type">${formatSportName(event.sport)}</span><span class="sports-tournament">${escapeHtml(event.tournament || "League event")}</span></div>
    <h3 class="sports-match">${escapeHtml(event.match || "Match to be confirmed")}</h3>
    <div class="sports-meta"><span><i class="fa-regular fa-calendar-days" aria-hidden="true"></i>${date}</span><span><i class="fa-regular fa-clock" aria-hidden="true"></i>${time}</span></div>
    <div class="sports-location"><span aria-hidden="true">📍</span><span>${escapeHtml(event.stadium || "Venue to be confirmed")}</span></div>
    <div class="sports-country"><span aria-hidden="true">🌍</span><span>${escapeHtml(event.country || "Location to be confirmed")}</span></div>
  </article>`;
}

/**
 * Attach click handlers that select a sport, update filter accessibility state,
 * and load a league schedule or render cached local events.
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
      if (LEAGUE_SPORTS.includes(activeSport)) await loadLeagueSchedule(activeSport);
      else renderSports();
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
  if (sportsContainer) sportsContainer.innerHTML = `<p class="sports-message">${escapeHtml(message)}</p>`;
}

/**
 * Get the display name or league abbreviation for a sport key.
 * @param {string} sport - Internal sport key.
 * @returns {string} The display label, or Sports for an unknown key.
 */
function formatSportName(sport) {
  return { football: "Football", cricket: "Cricket", golf: "Golf", basketball: "NBA", "american-football": "NFL", baseball: "MLB", "ice-hockey": "NHL" }[sport] || "Sports";
}

/**
 * Format the date portion of a space-separated schedule timestamp in local locale.
 * Keep the supplied time unchanged; missing input gets unavailable labels,
 * while input without both parts is returned as the date with an empty time.
 * @param {string} dateTime - Schedule value in YYYY-MM-DD HH:mm:ss form.
 * @returns {{date: string, time: string}} Display date and time strings.
 */
function formatEventDate(dateTime) {
  if (!dateTime) return { date: "Date unavailable", time: "Time unavailable" };
  const [date, time] = dateTime.split(" ");
  if (!date || !time) return { date: dateTime, time: "" };
  const [year, month, day] = date.split("-");
  const dateObject = new Date(Number(year), Number(month) - 1, Number(day));
  return { date: dateObject.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), time };
}
