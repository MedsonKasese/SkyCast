import { getSports } from "./api.js";
let sportsData = {
        football: [],
        cricket: [],
        golf: [],
};

let activeSport = "all";
let sportsFiltersInitialized = false;
export async function loadSports(location) {
        const sportsContainer = document.getElementById("sports-container");

        if (!sportsContainer) return;

        if (!location) {
                displaySportsMessage("Unable to load sports without a location.");
                return;
        }

        displaySportsMessage("Loading sports events...");

        try {
const data = await getSports(location);

                sportsData = {
                        football: data.football || [],
                        cricket: data.cricket || [],
                        golf: data.golf || [],
                };
                if (!sportsFiltersInitialized) {
                        setupSportsFilters();
                        sportsFiltersInitialized = true;
                }

                renderSports();

        } catch (error) {
                console.error("Sports error:", error);

                displaySportsMessage(
                        error.message || "Unable to load sports events.",
                );
        }
}
function renderSports() {
        const sportsContainer = document.getElementById("sports-container");

        if (!sportsContainer) return;

        const events = getFilteredEvents();

        const isSportsPage =
                window.location.pathname.endsWith("sports.html");

        const visibleEvents = isSportsPage
                ? events
                : events.slice(0, 3);

        if (events.length === 0) {
                displaySportsMessage("No upcoming sports events found.");
                return;
        }

        sportsContainer.innerHTML = visibleEvents
                .map((event) => createSportsCard(event))
                .join("");
}

function getFilteredEvents() {
        if (activeSport === "all") {
                return [
                        ...sportsData.football.map((event) => ({
                                ...event,
                                sport: "football",
                        })),
                        ...sportsData.cricket.map((event) => ({
                                ...event,
                                sport: "cricket",
                        })),
                        ...sportsData.golf.map((event) => ({
                                ...event,
                                sport: "golf",
                        })),
                ];
        }
else {
                events = (sportsData[activeSport] || []).map((event) => ({
                        ...event,
                        sport: activeSport,
                }));
        }

        return events.sort((a, b) =>
                (a.start || "").localeCompare(b.start || ""),
        );
}

function createSportsCard(event) {
        const sportName = formatSportName(event.sport);
        const { date, time } = formatEventDate(event.start);

        return `
                <article class="sports-card">
                        <div class="sports-card-header">
                                <span class="sports-type">${sportName}</span>
                                <span class="sports-tournament">
                                        ${escapeHtml(event.tournament)}
                                </span>
                        </div>

                        <h3 class="sports-match">
                                ${escapeHtml(event.match)}
                        </h3>

<div class="sports-meta">
        <span>
                <i class="fa-regular fa-calendar-days" aria-hidden="true"></i>
                ${date}
        </span>

        <span>
                <i class="fa-regular fa-clock" aria-hidden="true"></i>
                ${time}
        </span>
</div>

                        <div class="sports-location">
                                <span aria-hidden="true">📍</span>
                                <span>${escapeHtml(event.stadium)}</span>
                        </div>

                        <div class="sports-country">
                                <span aria-hidden="true">🌍</span>
                                <span>${escapeHtml(event.country)}</span>
                        </div>
                </article>
        `;
}

function setupSportsFilters() {
        const filters = document.querySelectorAll(".sports-filter");

        filters.forEach((filter) => {
                filter.addEventListener("click", () => {
                        activeSport = filter.dataset.sport;

                        filters.forEach((button) => {
                                const isActive = button === filter;

                                button.classList.toggle("active", isActive);
                                button.setAttribute(
                                        "aria-selected",
                                        String(isActive),
                                );
                        });

                        renderSports();
                });
        });
}

function displaySportsMessage(message) {
        const sportsContainer = document.getElementById("sports-container");

        if (!sportsContainer) return;

        sportsContainer.innerHTML = `
                <p class="sports-message">${escapeHtml(message)}</p>
        `;
}

function formatSportName(sport) {
        const names = {
                football: "Football",
                cricket: "Cricket",
                golf: "Golf",
        };

        return names[sport] || "Sports";
}

function formatEventDate(dateTime) {
        if (!dateTime) {
                return {
                        date: "Date unavailable",
                        time: "Time unavailable",
                };
        }

        const [date, time] = dateTime.split(" ");

        if (!date || !time) {
                return {
                        date: dateTime,
                        time: "",
                };
        }

        const [year, month, day] = date.split("-");

        const dateObject = new Date(
                Number(year),
                Number(month) - 1,
                Number(day),
        );

        const formattedDate = dateObject.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
        });

        return {
                date: formattedDate,
                time,
        };
}

function escapeHtml(value) {
        const element = document.createElement("div");

        element.textContent = value ?? "";

        return element.innerHTML;
}
