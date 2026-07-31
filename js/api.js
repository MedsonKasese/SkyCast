const BASE_URL = "/api/weather";

export async function getWeather(city) {
	try {
		const response = await fetch(`${BASE_URL}?q=${encodeURIComponent(city)}`);

		if (!response.ok) {
			let message = "Failed to fetch weather";

			try {
				const data = await response.json();
				message = data.error || message;
			} catch {
				// Response was not JSON
				message = `Server error (${response.status})`;
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
