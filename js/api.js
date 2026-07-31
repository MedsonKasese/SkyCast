const BASE_URL = "/api/weather";

export async function getWeather(city) {
	try {
		const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(city)}`);

		if (!response.ok) {
			const data = await response.json();

			throw new Error(data.error || "Failed to fetch weather");
		}

		return await response.json();
	} catch (error) {
		// Network failure (internet off, DNS failure, etc.)
		if (error instanceof TypeError) {
			throw new Error("NETWORK_ERROR");
		}

		throw error;
	}
}
