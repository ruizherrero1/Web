import { unstable_cache } from "next/cache";
import type { RawMatch, Score, TournamentData } from "@/app/apps/mundial/types";

const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const FOOTBALL_DATA_MATCHES_URL =
  "https://api.football-data.org/v4/competitions/WC/matches";

type ScoreTuple = [number, number];

type FootballDataTeam = {
  name?: string | null;
  shortName?: string | null;
  tla?: string | null;
};

type FootballDataScorePart = {
  home?: number | null;
  away?: number | null;
};

type FootballDataMatch = {
  id?: number;
  utcDate: string;
  status: string;
  stage?: string | null;
  group?: string | null;
  matchday?: number | null;
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score?: {
    fullTime?: FootballDataScorePart;
    halfTime?: FootballDataScorePart;
    extraTime?: FootballDataScorePart;
    penalties?: FootballDataScorePart;
  };
  venue?: string | null;
  lastUpdated?: string;
};

type FootballDataResponse = {
  matches?: FootballDataMatch[];
};

const teamAliases: Record<string, string> = {
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Bosnia-Herzegovina": "Bosnia & Herzegovina",
  "Cabo Verde": "Cape Verde",
  "Cape Verde Islands": "Cape Verde",
  "Congo DR": "DR Congo",
  "Cote d'Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "Czechia": "Czech Republic",
  "Korea Republic": "South Korea",
  "Netherlands": "Netherlands",
  "New Zealand": "New Zealand",
  "Saudi Arabia": "Saudi Arabia",
  "South Africa": "South Africa",
  "Türkiye": "Turkey",
  "United States": "USA",
  "United States of America": "USA",
};

const stageLabels: Record<string, string> = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-finals",
  SEMI_FINALS: "Semi-finals",
  THIRD_PLACE: "Third-place match",
  FINAL: "Final",
};

function normalizeTeam(team?: FootballDataTeam) {
  const name = team?.name ?? team?.shortName ?? team?.tla ?? "TBD";
  return teamAliases[name] ?? name;
}

function normalizeGroup(group?: string | null) {
  if (!group) {
    return undefined;
  }

  const letter = group.replace("GROUP_", "").replace("Group ", "").trim();
  return letter ? `Group ${letter}` : undefined;
}

function normalizeRound(match: FootballDataMatch) {
  if (match.group) {
    return "Group Stage";
  }

  const stage = match.stage ?? "";
  return stageLabels[stage] ?? (stage.replaceAll("_", " ") || "Match");
}

function tupleFromScore(score?: FootballDataScorePart): ScoreTuple | undefined {
  if (typeof score?.home !== "number" || typeof score.away !== "number") {
    return undefined;
  }

  return [score.home, score.away];
}

function normalizeScore(match: FootballDataMatch): Score | undefined {
  const fullTime = tupleFromScore(match.score?.fullTime);
  const halfTime = tupleFromScore(match.score?.halfTime);
  const extraTime = tupleFromScore(match.score?.extraTime);
  const penalties = tupleFromScore(match.score?.penalties);

  if (!fullTime && !halfTime && !extraTime && !penalties) {
    return undefined;
  }

  return {
    ...(fullTime ? { ft: fullTime } : {}),
    ...(halfTime ? { ht: halfTime } : {}),
    ...(extraTime ? { et: extraTime } : {}),
    ...(penalties ? { p: penalties } : {}),
  };
}

function normalizeFootballDataMatch(match: FootballDataMatch): RawMatch {
  const kickoff = new Date(match.utcDate);
  const date = kickoff.toISOString().slice(0, 10);
  const time = `${kickoff.toISOString().slice(11, 16)} UTC+0`;

  return {
    round: normalizeRound(match),
    num: match.id,
    date,
    time,
    team1: normalizeTeam(match.homeTeam),
    team2: normalizeTeam(match.awayTeam),
    group: normalizeGroup(match.group),
    ground: match.venue ?? undefined,
    matchStatus: match.status,
    score: normalizeScore(match),
  };
}

function matchKey(match: RawMatch) {
  const teams = [match.team1, match.team2].sort().join("|");
  return `${match.date}|${teams}`;
}

function mergeMatches(baseMatches: RawMatch[], liveMatches: RawMatch[]) {
  const byKey = new Map(baseMatches.map((match) => [matchKey(match), match]));

  for (const liveMatch of liveMatches) {
    const key = matchKey(liveMatch);
    const baseMatch = byKey.get(key);

    byKey.set(key, {
      ...(baseMatch ?? liveMatch),
      ...liveMatch,
      round: baseMatch?.round ?? liveMatch.round,
      group: baseMatch?.group ?? liveMatch.group,
      ground: liveMatch.ground ?? baseMatch?.ground,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => {
    const first = `${a.date} ${a.time ?? ""}`;
    const second = `${b.date} ${b.time ?? ""}`;
    return first.localeCompare(second);
  });
}

async function fetchOpenFootball(): Promise<TournamentData> {
  const response = await fetch(OPENFOOTBALL_URL, {
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`OpenFootball HTTP ${response.status}`);
  }

  const data = (await response.json()) as TournamentData;
  return {
    ...data,
    source: "openfootball",
    generatedAt: new Date().toISOString(),
  };
}

async function fetchFootballData(): Promise<RawMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return [];
  }

  const response = await fetch(FOOTBALL_DATA_MATCHES_URL, {
    headers: {
      "X-Auth-Token": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`football-data.org HTTP ${response.status}`);
  }

  const data = (await response.json()) as FootballDataResponse;
  return (data.matches ?? []).map(normalizeFootballDataMatch);
}

async function buildTournamentData(): Promise<TournamentData> {
  let baseData: TournamentData | null = null;
  let liveMatches: RawMatch[] = [];

  try {
    baseData = await fetchOpenFootball();
  } catch (error) {
    console.warn("[mundial] OpenFootball unavailable:", error);
  }

  try {
    liveMatches = await fetchFootballData();
  } catch (error) {
    console.warn("[mundial] football-data.org unavailable:", error);
  }

  if (baseData && liveMatches.length > 0) {
    return {
      ...baseData,
      matches: mergeMatches(baseData.matches, liveMatches),
      source: "football-data.org+openfootball",
      generatedAt: new Date().toISOString(),
    };
  }

  if (liveMatches.length > 0) {
    return {
      name: "World Cup 2026",
      matches: liveMatches,
      source: "football-data.org",
      generatedAt: new Date().toISOString(),
    };
  }

  if (baseData) {
    return baseData;
  }

  throw new Error("No World Cup data source is currently available");
}

// Cache compartido entre lambdas y cold starts (Next data cache), a diferencia
// del cache en memoria anterior que se perdia en cada instancia de Vercel.
// 90s mantiene a football-data.org muy por debajo de su limite de 10 req/min.
export const getTournamentData = unstable_cache(
  buildTournamentData,
  ["mundial-tournament-data"],
  { revalidate: 90 },
);
