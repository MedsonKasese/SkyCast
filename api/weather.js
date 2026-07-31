 default async function handler(req, res) {
	const { q } = req.query;

	if (!q) {
		return res.status(400).json({
			error: "Missing query parameter q",
		});
	}

	const API_KEY = process.env.WEATHER_API_KEY;

	try {
		const response = await fetch(
			`https://api.weatherapi.com/v1/current.json?key=${API_KEY}&q=${encodeURIComponent(q)}&aqi=no`,
		);

		const data = await response.json();

		if (!response.ok) {
			return res.status(response.status).json({
				error: data.error?.message || "Weather API error",
			});
		}

		return res.status(200).json(data);
	} catch (error) {
		return res.status(500).json({
			error: "Server error",
		});
	}
}
