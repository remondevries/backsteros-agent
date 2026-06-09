import { loadUserCity } from "./context/profile.ts";

const WEATHER_CODES: Record<number, string> = {
  0: "clear skies",
  1: "mainly clear",
  2: "partly cloudy",
  3: "overcast",
  45: "foggy",
  48: "foggy",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  80: "rain showers",
  81: "rain showers",
  82: "heavy rain showers",
  95: "thunderstorms",
};

export interface MorningReviewWeather {
  locationLabel: string;
  description: string;
  temperatureC: number | null;
}

function weatherDescription(code: number | null | undefined): string {
  if (code == null) return "unknown conditions";
  return WEATHER_CODES[code] ?? "mixed conditions";
}

async function geocodeCity(city: string): Promise<{ latitude: number; longitude: number; label: string } | null> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city.split(",")[0]?.trim() ?? city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) return null;

  const body = (await response.json()) as {
    results?: Array<{ name: string; country?: string; latitude: number; longitude: number }>;
  };
  const match = body.results?.[0];
  if (!match) return null;

  const label = match.country ? `${match.name}, ${match.country}` : match.name;
  return { latitude: match.latitude, longitude: match.longitude, label };
}

export async function fetchMorningReviewWeather(city = loadUserCity()): Promise<MorningReviewWeather | null> {
  if (!city?.trim()) return null;

  const coords = await geocodeCity(city);
  if (!coords) return null;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(coords.latitude));
  url.searchParams.set("longitude", String(coords.longitude));
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url);
  if (!response.ok) return null;

  const body = (await response.json()) as {
    current?: { temperature_2m?: number; weather_code?: number };
  };
  const current = body.current;
  if (!current) return null;

  const description = weatherDescription(current.weather_code);
  const temperature =
    typeof current.temperature_2m === "number" ? Math.round(current.temperature_2m) : null;

  return {
    locationLabel: coords.label,
    description,
    temperatureC: temperature,
  };
}

export function formatWeatherLine(weather: MorningReviewWeather | null | undefined): string {
  if (!weather) {
    return "Weather is unavailable right now.";
  }

  const temp =
    weather.temperatureC == null ? "" : ` and ${weather.temperatureC}°C`;
  return `Weather today in ${weather.locationLabel} is ${weather.description}${temp}.`;
}
