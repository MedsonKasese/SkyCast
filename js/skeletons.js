// Keep real content in place so a failed refresh can reveal the last good data.
// CSS covers the entire card, including headings, icons, controls and padding.
export function setCardLoading(section, loading) {
  if (!section) return;
  section.classList.toggle("sky-is-loading", loading);
  section.setAttribute("aria-busy", String(loading));
  if (loading) {
    if (!section.hasAttribute("data-sky-inert")) {
      section.dataset.skyInert = String(section.hasAttribute("inert"));
    }
    section.setAttribute("inert", "");
  } else if (section.hasAttribute("data-sky-inert")) {
    if (section.dataset.skyInert !== "true") section.removeAttribute("inert");
    delete section.dataset.skyInert;
  }
}

export function setWeatherSkeletons(loading) {
  document.querySelectorAll("[data-weather-loading]").forEach((section) => {
    section.dataset.weatherPending = String(loading);
    setCardLoading(section, loading || section.dataset.radarPending === "true");
  });
}

export function setSportsLoading(loading) {
  const container = document.getElementById("sports-container");
  if (!container) return;
  setCardLoading(container.closest(".sports-section") || container, loading);
  container.setAttribute("aria-busy", String(loading));
}

export function showSportsSkeleton() {
  setSportsLoading(true);
}
