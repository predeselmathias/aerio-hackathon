"use client";

import { useEffect, useState } from "react";

import {
  bestWindow,
  fetchTodayWeather,
  scoreHour,
  type WeatherResponse,
} from "~/lib/weather";

const AREA_KEY = "aerio.flightArea";
const HOME_AREA_KEY = "aerio.homeArea";
const WEATHER_CACHE_KEY = "aerio.weatherCache";

const cities = [
  { name: "București", lat: 44.4268, lon: 26.1025 },
  { name: "Cluj-Napoca", lat: 46.7712, lon: 23.6236 },
  { name: "Timișoara", lat: 45.7489, lon: 21.2087 },
  { name: "Iași", lat: 47.1585, lon: 27.6014 },
  { name: "Constanța", lat: 44.1598, lon: 28.6348 },
  { name: "Brașov", lat: 45.6427, lon: 25.5887 },
  { name: "Arad", lat: 46.1866, lon: 21.3123 },
] as const;

type City = (typeof cities)[number];
type SavedArea = { city: string; lat: number; lon: number };

function cityForCoordinates(lat: number, lon: number) {
  return (
    cities.reduce((closest, city) => {
      const closestDistance =
        (closest.lat - lat) ** 2 + (closest.lon - lon) ** 2;
      const cityDistance = (city.lat - lat) ** 2 + (city.lon - lon) ** 2;
      return cityDistance < closestDistance ? city : closest;
    }) ?? cities[0]
  );
}

function readDefaultCity() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(HOME_AREA_KEY) ?? "null",
    ) as SavedArea | null;
    const savedCity = cities.find((city) => city.name === saved?.city);
    if (savedCity) return savedCity;

    const area = JSON.parse(localStorage.getItem(AREA_KEY) ?? "[]") as unknown;
    if (Array.isArray(area) && area.length > 0) {
      const points = area as [number, number][];
      const center = points.reduce(
        (result, [lat, lon]) => [result[0] + lat, result[1] + lon],
        [0, 0],
      );
      return cityForCoordinates(
        center[0] / points.length,
        center[1] / points.length,
      );
    }
  } catch (error) {
    console.error("Could not read the saved weather area.", error);
  }
  return cities[0];
}

function readCache(): WeatherResponse | null {
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    return cached ? (JSON.parse(cached) as WeatherResponse) : null;
  } catch (error) {
    console.error("Could not read the saved weather response.", error);
    return null;
  }
}

function statusLabel(
  label: "Bun" | "Atenție" | "Nu zbura",
  romanian: boolean,
) {
  if (romanian) return label;
  return label === "Bun" ? "Good" : label === "Atenție" ? "Caution" : "Do not fly";
}

export function WeatherCard({ romanian }: { romanian: boolean }) {
  const [city, setCity] = useState<City>(cities[0]);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setCity(readDefaultCity());
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setCached(false);
    void fetchTodayWeather(city.lat, city.lon)
      .then((response) => {
        if (!active) return;
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(response));
        setWeather(response);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        console.error("Could not load today's weather.", requestError);
        const saved = readCache();
        if (saved) {
          setWeather(saved);
          setCached(true);
        } else {
          setError(
            romanian
              ? "Datele meteo nu au putut fi încărcate."
              : "Weather data could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [city, romanian]);

  function changeCity(name: string) {
    const nextCity = cities.find((item) => item.name === name);
    if (!nextCity) return;
    localStorage.setItem(
      HOME_AREA_KEY,
      JSON.stringify({ city: nextCity.name, lat: nextCity.lat, lon: nextCity.lon }),
    );
    setCity(nextCity);
  }

  const visibleHours =
    weather?.hourly.filter((hour) => {
      const hourNumber = Number(hour.time.slice(11, 13));
      return hourNumber >= 8 && hourNumber <= 20;
    }) ?? [];
  const recommendation = weather ? bestWindow(weather.hourly) : null;

  return (
    <section className="content-card weather-card" aria-label={romanian ? "Vreme" : "Weather"}>
      <div className="section-heading weather-card-heading">
        <div>
          <span className="eyebrow">{romanian ? "CONDIȚII METEO" : "WEATHER CONDITIONS"}</span>
          <h2>{romanian ? "Planifică după vreme" : "Plan around the weather"}</h2>
        </div>
        <label className="field weather-city">
          <span>{romanian ? "Zonă" : "Area"}</span>
          <select value={city.name} onChange={(event) => changeCity(event.target.value)}>
            {cities.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading && <p className="muted">{romanian ? "Se încarcă datele meteo…" : "Loading weather data…"}</p>}
      {!loading && error && (
        <div className="notice notice-warning">
          <p>{error}</p>
          <button className="button button-quiet" type="button" onClick={() => setCity({ ...city })}>
            {romanian ? "Reîncearcă" : "Retry"}
          </button>
        </div>
      )}
      {!loading && weather && (
        <>
          <div className="weather-current">
            <strong>{Math.round(weather.hourly[0]?.temperature ?? 0)}°C</strong>
            <span>
              {romanian ? "Vânt" : "Wind"} {weather.hourly[0]?.windSpeed.toFixed(1)} m/s ·{" "}
              {romanian ? "rafale" : "gusts"} {weather.hourly[0]?.windGusts.toFixed(1)} m/s
            </span>
          </div>
          <div className="weather-hours">
            {visibleHours.map((hour) => {
              const status = scoreHour(hour);
              return (
                <span
                  className={`weather-chip weather-${status.score > 70 ? "good" : status.score >= 40 ? "caution" : "no-go"}`}
                  key={hour.time}
                >
                  <strong>{hour.time.slice(11, 16)}</strong>
                  <small>{statusLabel(status.label, romanian)}</small>
                </span>
              );
            })}
          </div>
          <p className="weather-recommendation">
            {romanian ? "Recomandare" : "Recommendation"}:{" "}
            {recommendation ? `${recommendation.start}-${recommendation.end}` : romanian ? "Nu există" : "None"} (demo)
            {cached && <span> · {romanian ? "date salvate" : "saved data"}</span>}
          </p>
        </>
      )}
      <p className="small-note">{romanian ? "Date meteo: Open-Meteo" : "Weather data: Open-Meteo"}</p>
    </section>
  );
}
