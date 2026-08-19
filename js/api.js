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
