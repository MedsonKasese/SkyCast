let radarMap = null;
let radarLayer = null;
let currentCoordinates = null;

const DEFAULT_ZOOM = 7;
const RADAR_ZOOM = 8;

export function initializeRadar(weather) {
  const mapElement = document.getElementById("weather-radar");
  const locationElement = document.getElementById("radar-location");

  if (!mapElement || !weather?.location) {
    return;
  }

  const { lat, lon, name } = weather.location;

  currentCoordinates = {
    lat,
    lon,
    name,
  };

  if (locationElement) {
    locationElement.textContent = `Radar for ${name}`;
  }

  if (!radarMap) {
    radarMap = L.map("weather-radar").setView(
      [lat, lon],
      DEFAULT_ZOOM,
    );

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(radarMap);
  } else {
    radarMap.setView([lat, lon], DEFAULT_ZOOM);
  }

  loadRadarLayer();

  setTimeout(() => {
    radarMap.invalidateSize();
  }, 100);
}

async function loadRadarLayer() {
  try {
    const response = await fetch(
      "https://api.rainviewer.com/public/weather-maps.json",
    );

    if (!response.ok) {
      throw new Error("Unable to load radar data");
    }

    const data = await response.json();

    const radarFrames = data.radar?.past || [];

    if (radarFrames.length === 0) {
      return;
    }

    const latestFrame = radarFrames[radarFrames.length - 1];

    if (radarLayer) {
      radarMap.removeLayer(radarLayer);
    }

    radarLayer = L.tileLayer(
      `https://tilecache.rainviewer.com${latestFrame.path}/256/{z}/{x}/{y}/2/1_1.png`,
      {
        opacity: 0.7,
        maxZoom: 12,
      },
    ).addTo(radarMap);
  } catch (error) {
    console.error("Radar error:", error);
  }
}

export function centerRadarOnLocation() {
  if (!radarMap || !currentCoordinates) {
    return;
  }

  radarMap.setView(
    [currentCoordinates.lat, currentCoordinates.lon],
    RADAR_ZOOM,
  );
}
