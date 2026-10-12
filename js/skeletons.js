// Loading placeholders are rendered only while fresh API data is pending.
const line = (width = "70%") => `<span class="sky-skeleton sky-skeleton-line" style="width:${width}"></span>`;
const forecastCard = () => `<div class="forecast-card sky-skeleton-card" aria-hidden="true">${line("45%")}<span class="sky-skeleton sky-skeleton-icon"></span>${line("65%")}${line("80%")}</div>`;

export function setWeatherSkeletons(loading) {
  const targets = [".weather-card:not(.weather-radar-section):not(.hourly-section):not(.forecast-section):not(.sports-section)", ".weather-details", ".sun-times-section", ".hourly-section", ".forecast-section"];
  for (const selector of targets) {
    const section = document.querySelector(selector);
    if (!section) continue;
    section.classList.toggle("sky-is-loading", loading);
    section.setAttribute("aria-busy", String(loading));
  }
  if (loading) {
    for (const [id, count] of [["hourly-container", 7], ["forecast-container", 3]]) {
      const container = document.getElementById(id);
      if (container) container.innerHTML = Array.from({length: count}, forecastCard).join("");
    }
  } else {
    // On failure, never leave placeholder cards in the forecast.
    for (const id of ["hourly-container", "forecast-container"]) {
      const container = document.getElementById(id);
      if (container) container.querySelectorAll(".sky-skeleton-card").forEach(card => card.remove());
    }
  }
}

export function showSportsSkeleton() {
  const container = document.getElementById("sports-container");
  if (!container) return;
  container.setAttribute("aria-busy", "true");
  container.innerHTML = Array.from({length: 3}, () => `<div class="sports-card sky-skeleton-card" aria-hidden="true">${line("35%")}${line("90%")}${line("65%")}${line("80%")}</div>`).join("");
}
