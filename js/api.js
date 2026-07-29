const API_KEY = "7f0bcbdba3e7434da2a124045261907"; // recommended: remove the api key to env variable
const BASE_URL = "https://api.weatherapi.com/v1/forecast.json";
export async function getWeather(city) {
	try {
		const response = await fetch(
			`${BASE_URL}?key=${API_KEY}&q=${city}&days=3&aqi=no&alerts=no`,
		);

		if (!response.ok) {
			const data = await response.json();

			throw new Error(data.error?.message || `HTTP ${response.status}`);
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
