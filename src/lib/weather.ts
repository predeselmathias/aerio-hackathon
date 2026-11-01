export type WeatherHour = {
  time: string;
  temperature: number;
  precipitationProbability: number;
  windSpeed: number;
  windGusts: number;
  visibility: number;
  cloudCover: number;
  daylight: boolean;
};

export type WeatherResponse = {
  latitude: number;
  longitude: number;
  hourly: WeatherHour[];
  sunrise: string;
  sunset: string;
};

type OpenMeteoResponse = {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    visibility: number[];
    cloud_cover: number[];
  };
  daily: {
    sunrise: string[];
    sunset: string[];
  };
};

export type WeatherScore = {
  score: number;
  label: "Bun" | "Atenție" | "Nu zbura";
};

export const WEATHER_THRESHOLDS = {
  gustNoGo: 10,
  windPenalty: 8,
  rainPenalty: 40,
  visibilityPenalty: 5000,
  denseClouds: 80,
  goodScore: 70,
  cautionScore: 40,
} as const;

const weatherUrl = "https://api.open-meteo.com/v1/forecast";

export async function fetchTodayWeather(
  lat: number,
  lon: number,
): Promise<WeatherResponse> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    hourly:
      "temperature_2m,precipitation_probability,wind_speed_10m,wind_gusts_10m,visibility,cloud_cover",
    daily: "sunrise,sunset",
    wind_speed_unit: "ms",
    timezone: "Europe/Bucharest",
    forecast_days: "1",
  });
  const response = await fetch(`${weatherUrl}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status}).`);
  }
  const data = (await response.json()) as OpenMeteoResponse;
  const sunrise = data.daily.sunrise[0];
  const sunset = data.daily.sunset[0];
  if (
    !sunrise ||
    !sunset ||
    data.hourly.time.length !== data.hourly.temperature_2m.length
  ) {
    throw new Error("Weather response is incomplete.");
  }

  return {
    latitude: data.latitude,
    longitude: data.longitude,
    sunrise,
    sunset,
    hourly: data.hourly.time.map((time, index) => ({
      time,
      temperature: data.hourly.temperature_2m[index] ?? 0,
      precipitationProbability:
        data.hourly.precipitation_probability[index] ?? 0,
      windSpeed: data.hourly.wind_speed_10m[index] ?? 0,
      windGusts: data.hourly.wind_gusts_10m[index] ?? 0,
      visibility: data.hourly.visibility[index] ?? 0,
      cloudCover: data.hourly.cloud_cover[index] ?? 0,
      daylight: time >= sunrise && time <= sunset,
    })),
  };
}

export function scoreHour(hour: WeatherHour): WeatherScore {
  // Demo thresholds: these are heuristic planning hints, not aviation advice.
  if (hour.windGusts > WEATHER_THRESHOLDS.gustNoGo || !hour.daylight) {
    return { score: 0, label: "Nu zbura" };
  }

  let score = 100;
  if (hour.windSpeed > WEATHER_THRESHOLDS.windPenalty) score -= 20;
  if (hour.precipitationProbability > WEATHER_THRESHOLDS.rainPenalty)
    score -= 25;
  if (hour.visibility < WEATHER_THRESHOLDS.visibilityPenalty) score -= 25;
  if (hour.cloudCover > WEATHER_THRESHOLDS.denseClouds) score -= 15;
  const boundedScore = Math.max(0, score);

  return {
    score: boundedScore,
    label:
      boundedScore > WEATHER_THRESHOLDS.goodScore
        ? "Bun"
        : boundedScore >= WEATHER_THRESHOLDS.cautionScore
          ? "Atenție"
          : "Nu zbura",
  };
}

export function bestWindow(
  hours: WeatherHour[],
  durationH = 2,
): { start: string; end: string; score: number } | null {
  const candidates = hours.filter((hour) => {
    const hourNumber = Number(hour.time.slice(11, 13));
    return hourNumber >= 8 && hourNumber < 20 && hour.daylight;
  });
  const windowSize = Math.max(1, Math.round(durationH));
  let best: { start: string; end: string; score: number } | null = null;

  for (let index = 0; index <= candidates.length - windowSize; index += 1) {
    const window = candidates.slice(index, index + windowSize);
    if (
      window.length !== windowSize ||
      window.some(
        (hour, windowIndex) =>
          windowIndex > 0 &&
          Number(hour.time.slice(11, 13)) !==
            Number(window[windowIndex - 1]!.time.slice(11, 13)) + 1,
      )
    )
      continue;
    const score = Math.round(
      window.reduce((total, hour) => total + scoreHour(hour).score, 0) /
        window.length,
    );
    if (!best || score > best.score) {
      const start = window[0]!.time.slice(11, 16);
      const endHour = Number(window[window.length - 1]!.time.slice(11, 13)) + 1;
      best = {
        start,
        end: `${String(endHour).padStart(2, "0")}:00`,
        score,
      };
    }
  }

  return best;
}
