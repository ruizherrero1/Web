export type RottenTomatoesScores = {
  tomatometer: number | null;
  popcornmeter: number | null;
};

type RottenTomatoesResponse = {
  title?: string;
  tomatometer_score?: unknown;
  audience_score?: unknown;
};

const rapidApiHost = "rottentomato.p.rapidapi.com";

export function hasRottenTomatoesEnv() {
  return Boolean(process.env.ROTTENTOMATO_RAPIDAPI_KEY ?? process.env.RAPIDAPI_KEY);
}

export async function fetchRottenTomatoesScores(name: string): Promise<RottenTomatoesScores> {
  const key = process.env.ROTTENTOMATO_RAPIDAPI_KEY ?? process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("Rotten Tomatoes API is not configured.");

  const url = `https://${rapidApiHost}/?name=${encodeURIComponent(name)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "json",
      "x-rapidapi-host": rapidApiHost,
      "x-rapidapi-key": key,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Rotten Tomatoes request failed: ${response.status}`);
  const payload = (await response.json()) as RottenTomatoesResponse;

  return {
    tomatometer: parsePercent(payload.tomatometer_score),
    popcornmeter: parsePercent(payload.audience_score),
  };
}

function parsePercent(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return clampPercent(value);
  if (typeof value !== "string") return null;
  const match = value.match(/\d+(?:\.\d+)?/);
  if (!match) return null;
  return clampPercent(Number(match[0]));
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}