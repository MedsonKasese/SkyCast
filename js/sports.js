import { getLeagueEvents, getSports } from "./api.js";
import { escapeHtml } from "./utils.js";
import { syncSportsNotifications } from "./notifications.js";
import { applyTheme } from "./settings.js";

const LEAGUE_SPORTS = ["basketball", "american-football", "baseball", "ice-hockey"];
let sportsData = { football: [], cricket: [], golf: [] };
let activeSport = "all";
let sportsFiltersInitialized = false;
let currentSportsRequestId = 0;

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

function renderSports() {
  const sportsContainer = document.getElementById("sports-container");
  const events = getFilteredEvents();
  const visibleEvents = window.location.pathname.endsWith("sports.html") ? events : events.slice(0, 3);

  if (!events.length) return displaySportsMessage("No upcoming sports events found.");
  sportsContainer.innerHTML = visibleEvents.map(createSportsCard).join("");
}

function getFilteredEvents() {
  const events = activeSport === "all"
    ? Object.entries(sportsData).flatMap(([sport, items]) => items.map((event) => ({ ...event, sport })))
    : (sportsData[activeSport] || []).map((event) => ({ ...event, sport: activeSport }));
  return events.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
}

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

function displaySportsMessage(message) {
  const sportsContainer = document.getElementById("sports-container");
  if (sportsContainer) sportsContainer.innerHTML = `<p class="sports-message">${escapeHtml(message)}</p>`;
}

function formatSportName(sport) {
  return { football: "Football", cricket: "Cricket", golf: "Golf", basketball: "NBA", "american-football": "NFL", baseball: "MLB", "ice-hockey": "NHL" }[sport] || "Sports";
}

function formatEventDate(dateTime) {
  if (!dateTime) return { date: "Date unavailable", time: "Time unavailable" };
  const [date, time] = dateTime.split(" ");
  if (!date || !time) return { date: dateTime, time: "" };
  const [year, month, day] = date.split("-");
  const dateObject = new Date(Number(year), Number(month) - 1, Number(day));
  return { date: dateObject.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }), time };
}
