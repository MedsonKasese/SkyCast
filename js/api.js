const BASE_URL = "/api/weather";

export async function getWeather(city, signal) {
  try {
    const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(city)}`, {
      signal,
    });

    if (!response.ok) {
      let message = "Failed to fetch weather";

      try {
        const data = await response.json();
        message = data.error || message;
      } catch {
        // Response was not JSON
        message = `Unable to fetch weather due to Server error (${response.status})`;
      }

      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }
    if (error instanceof TypeError) {
      throw new Error("NETWORK_ERROR");
    }

    throw error;
  }
}
const SPORTS_BASE_URL = "/api/sports";

export async function getSports(location) {
  try {
    const response = await fetch(
      `${SPORTS_BASE_URL}?q=${encodeURIComponent(location)}`,
    );

    if (!response.ok) {
      let message = "Failed to fetch sports events";

      try {
        const data = await response.json();
        message = data.error || message;
      } catch {
        message = `Unable to fetch sports data due to Server error (${response.status})`;
      }

      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("NETWORK_ERROR");
    }

    throw error;
  }
}

/**
 * Request an upcoming league schedule from the local API proxy.
 * @param {string} league - Sport key: basketball, american-football, baseball, or ice-hockey.
 * @returns {Promise<{league: string, events: Object[]}>} League label and normalized events.
 * @throws {Error} If the request fails or the response cannot be parsed as JSON.
 */
export async function getLeagueEvents(league) {
  const response = await fetch(`/api/leagues?league=${encodeURIComponent(league)}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Unable to fetch league schedule");
  }

  return response.json();
}
