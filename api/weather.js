export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const q = req.query?.q;

    if (q === undefined || q === null || q === "") {
      return res.status(400).json({
        error: "Missing query parameter q",
      });
    }
    if (typeof q !== "string" || !q.trim() || q.trim().length > 200) {
      return res.status(400).json({ error: "Invalid query parameter q" });
    }
    const location = q.trim();

    const API_KEY = process.env.WEATHER_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        error: "WEATHER_API_KEY is not configured",
      });
    }

    const url = `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(location)}&days=3&aqi=no&alerts=yes`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();

    if (!response.ok) {
      return res.status(502).json({ error: "Weather service unavailable" });
    }

    return res.status(200).json(data);
  } catch {
    return res.status(502).json({
      error: "Weather service unavailable",
    });
  }
}
