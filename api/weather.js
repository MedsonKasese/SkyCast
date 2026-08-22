export default async function handler(req, res) {
	try {
		const { q } = req.query;

		if (!q) {
			return res.status(400).json({
				error: "Missing query parameter q",
			});
		}

		const API_KEY = process.env.WEATHER_API_KEY;

		if (!API_KEY) {
			return res.status(500).json({
				error: "WEATHER_API_KEY is not configured",
			});
		}

		const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(q)}&days=3&aqi=no&alerts=yes`;

		const response = await fetch(url);
		const data = await response.json();

		if (!response.ok) {
			return res.status(response.status).json({
				error: data.error?.message || "Weather API error",
			});
		}

		return res.status(200).json(data);
	} catch (error) {
		console.error("Function crashed:", error);

		return res.status(500).json({
			error: error.message || "Internal server error",
		});
	}
}
