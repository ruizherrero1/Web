import { unstable_cache } from "next/cache";
import type { GoalEvent, RawMatch, Score, Scorer, TournamentData } from "@/app/apps/mundial/types";

const OPENFOOTBALL_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";
const FOOTBALL_DATA_MATCHES_URL =
  "https://api.football-data.org/v4/competitions/WC/matches";
const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=2026&limit=200";
const FOOTBALL_DATA_SCORERS_URL =
  "https://api.football-data.org/v4/competitions/WC/scorers?limit=25";

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
  minute?: number | null;
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

type EspnCompetitor = {
  homeAway?: "home" | "away";
  score?: string;
  winner?: boolean;
  shootoutScore?: string | number | null;
  penaltyShootoutScore?: string | number | null;
  penaltyScore?: string | number | null;
  linescores?: Array<{
    value?: string | number | null;
    displayValue?: string | null;
    period?: number;
  }>;
  team?: {
    id?: string;
    displayName?: string | null;
    shortDisplayName?: string | null;
  };
};

type EspnDetail = {
  scoringPlay?: boolean;
  ownGoal?: boolean;
  penaltyKick?: boolean;
  shootout?: boolean;
  team?: { id?: string };
  athletesInvolved?: Array<{ displayName?: string | null }>;
  clock?: { value?: number; displayValue?: string };
  period?: { number?: number };
};

type EspnEvent = {
  id?: string;
  date: string;
  status?: {
    type?: {
      name?: string;
      state?: "pre" | "in" | "post";
      completed?: boolean;
    };
  };
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    details?: EspnDetail[];
    venue?: {
      fullName?: string | null;
    };
  }>;
};

type EspnResponse = {
  events?: EspnEvent[];
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
    minute: typeof match.minute === "number" ? match.minute : undefined,
    score: normalizeScore(match),
  };
}

function espnGoalMinute(detail: EspnDetail): string {
  const display = detail.clock?.displayValue;
  if (display) {
    // ESPN may return "39:00", "39", or "45+2:00" formats
    const m = display.match(/^(\d+)(?::\d+)?(?:\+(\d+))?/);
    if (m) return m[2] ? `${m[1]}+${m[2]}'` : `${m[1]}'`;
    return `${display}'`;
  }
  const secs = detail.clock?.value ?? 0;
  const period = detail.period?.number ?? 1;
  const mins = Math.ceil(secs / 60);
  if (period === 2) return `${45 + mins}'`;
  if (period === 3) return `${90 + mins}'`;
  if (period === 4) return `${105 + mins}'`;
  return `${mins}'`;
}

function normalizeEspnStatus(event: EspnEvent) {
  const type = event.status?.type;
  const name = type?.name ?? "";

  if (type?.completed || type?.state === "post") {
    return "FINISHED";
  }

  if (type?.state !== "in") {
    return "SCHEDULED";
  }

  if (name.includes("HALFTIME")) return "PAUSED";
  if (name.includes("EXTRA_TIME")) return "EXTRA_TIME";
  if (name.includes("PENALTY")) return "PENALTY_SHOOTOUT";
  return "IN_PLAY";
}

function numericScore(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  const score = typeof value === "number" ? value : Number(value);
  return Number.isFinite(score) ? score : undefined;
}

function competitorShootoutScore(competitor?: EspnCompetitor) {
  const direct =
    numericScore(competitor?.shootoutScore) ??
    numericScore(competitor?.penaltyShootoutScore) ??
    numericScore(competitor?.penaltyScore);
  if (typeof direct === "number") return direct;

  const shootoutLine = competitor?.linescores?.find((line) => line.period === 5);
  return numericScore(shootoutLine?.value ?? shootoutLine?.displayValue);
}
function normalizeEspnTeam(competitor?: EspnCompetitor) {
  const name =
    competitor?.team?.displayName ??
    competitor?.team?.shortDisplayName ??
    "TBD";
  return teamAliases[name] ?? name;
}

function normalizeEspnMatch(event: EspnEvent): RawMatch | null {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find(
    (competitor) => competitor.homeAway === "home",
  );
  const away = competition?.competitors?.find(
    (competitor) => competitor.homeAway === "away",
  );

  if (!home || !away) return null;

  const kickoff = new Date(event.date);
  if (Number.isNaN(kickoff.getTime())) return null;

  const matchStatus = normalizeEspnStatus(event);
  const homeScore = Number(home.score);
  const awayScore = Number(away.score);
  const hasScore =
    matchStatus !== "SCHEDULED" &&
    Number.isFinite(homeScore) &&
    Number.isFinite(awayScore);

  // Build team ID → name map to attribute goals to the right team
  const teamById = new Map<string, string>();
  for (const competitor of competition?.competitors ?? []) {
    if (competitor.team?.id) {
      teamById.set(competitor.team.id, normalizeEspnTeam(competitor));
    }
  }

  const shootoutGoalsByTeam = new Map<string, number>();
  for (const detail of competition?.details ?? []) {
    if (!detail.shootout || !detail.scoringPlay || !detail.team?.id) continue;
    shootoutGoalsByTeam.set(
      detail.team.id,
      (shootoutGoalsByTeam.get(detail.team.id) ?? 0) + 1,
    );
  }

  const homePenalties =
    competitorShootoutScore(home) ??
    (home.team?.id ? shootoutGoalsByTeam.get(home.team.id) : undefined);
  const awayPenalties =
    competitorShootoutScore(away) ??
    (away.team?.id ? shootoutGoalsByTeam.get(away.team.id) : undefined);
  const penaltyScore =
    typeof homePenalties === "number" && typeof awayPenalties === "number"
      ? ([homePenalties, awayPenalties] as ScoreTuple)
      : undefined;

  const goals: GoalEvent[] = [];
  for (const detail of competition?.details ?? []) {
    if (!detail.scoringPlay || detail.shootout) continue;
    const name = detail.athletesInvolved?.[0]?.displayName;
    if (!name) continue;
    const team = teamById.get(detail.team?.id ?? "") ?? "TBD";
    goals.push({
      minute: espnGoalMinute(detail),
      scorer: name,
      team,
      ...(detail.ownGoal ? { ownGoal: true } : {}),
      ...(detail.penaltyKick ? { penalty: true } : {}),
    });
  }

  return {
    round: "Match",
    num: event.id ? Number(event.id) : undefined,
    date: kickoff.toISOString().slice(0, 10),
    time: `${kickoff.toISOString().slice(11, 16)} UTC+0`,
    team1: normalizeEspnTeam(home),
    team2: normalizeEspnTeam(away),
    ground: competition?.venue?.fullName ?? undefined,
    matchStatus,
    score: hasScore
      ? { ft: [homeScore, awayScore], ...(penaltyScore ? { p: penaltyScore } : {}) }
      : undefined,
    ...(goals.length > 0 ? { goals } : {}),
  };
}

function teamsKey(match: RawMatch) {
  return [match.team1, match.team2].sort().join("|");
}

function dateDistance(first: RawMatch, second: RawMatch) {
  return Math.abs(
    new Date(`${first.date}T12:00:00Z`).getTime() -
      new Date(`${second.date}T12:00:00Z`).getTime(),
  );
}

function kickoffTimestamp(match: RawMatch) {
  const time = match.time?.match(
    /^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2})(?::?(\d{2}))?)?$/,
  );

  if (!time) return Number.NaN;

  const [year, month, day] = match.date.split("-").map(Number);
  const hours = Number(time[1]);
  const minutes = Number(time[2]);
  const offsetHours = time[3] ? Number(time[3]) : 0;
  const offsetMinutes = time[4] ? Number(time[4]) : 0;
  const offsetSign = time[3]?.startsWith("-") ? -1 : 1;
  const offset = offsetHours * 60 + offsetSign * offsetMinutes;

  return Date.UTC(year, month - 1, day, hours, minutes) - offset * 60_000;
}

function mergeScore(baseScore?: RawMatch["score"], liveScore?: RawMatch["score"]) {
  if (!baseScore) return liveScore;
  if (!liveScore) return baseScore;
  return {
    ...baseScore,
    ...liveScore,
    ...(liveScore.ht ?? baseScore.ht ? { ht: liveScore.ht ?? baseScore.ht } : {}),
    ...(liveScore.et ?? baseScore.et ? { et: liveScore.et ?? baseScore.et } : {}),
    ...(liveScore.p ?? baseScore.p ? { p: liveScore.p ?? baseScore.p } : {}),
  };
}
function mergeMatches(
  baseMatches: RawMatch[],
  liveMatches: RawMatch[],
  appendUnmatched = true,
) {
  const mergedMatches = [...baseMatches];

  for (const liveMatch of liveMatches) {
    const candidates = mergedMatches
      .map((match, index) => ({ match, index }))
      .filter(({ match }) => teamsKey(match) === teamsKey(liveMatch))
      .sort(
        (first, second) =>
          dateDistance(first.match, liveMatch) -
          dateDistance(second.match, liveMatch),
      );
    const liveKickoff = kickoffTimestamp(liveMatch);
    const kickoffCandidates = Number.isNaN(liveKickoff)
      ? []
      : mergedMatches
          .map((match, index) => ({ match, index }))
          .filter(({ match }) => {
            const kickoff = kickoffTimestamp(match);
            return (
              !Number.isNaN(kickoff) &&
              Math.abs(kickoff - liveKickoff) <= 5 * 60 * 1000
            );
          });
    const closest =
      candidates[0] ??
      (kickoffCandidates.length === 1 ? kickoffCandidates[0] : undefined);
    const matchesExisting =
      closest && dateDistance(closest.match, liveMatch) <= 24 * 60 * 60 * 1000;
    const baseMatch = matchesExisting ? closest.match : undefined;
    const nextMatch = {
      ...(baseMatch ?? liveMatch),
      ...liveMatch,
      round: baseMatch?.round ?? liveMatch.round,
      group: baseMatch?.group ?? liveMatch.group,
      ground: liveMatch.ground ?? baseMatch?.ground,
      score: mergeScore(baseMatch?.score, liveMatch.score),
    };

    if (matchesExisting) {
      mergedMatches[closest.index] = nextMatch;
    } else if (appendUnmatched) {
      mergedMatches.push(nextMatch);
    }
  }

  return mergedMatches.sort((a, b) => {
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

async function fetchEspnScores(): Promise<RawMatch[]> {
  const response = await fetch(ESPN_SCOREBOARD_URL, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`ESPN HTTP ${response.status}`);
  }

  const data = (await response.json()) as EspnResponse;
  return (data.events ?? [])
    .map(normalizeEspnMatch)
    .filter((match): match is RawMatch => match !== null);
}

async function buildTournamentData(): Promise<TournamentData> {
  let baseData: TournamentData | null = null;
  let footballDataMatches: RawMatch[] = [];
  let espnMatches: RawMatch[] = [];

  try {
    baseData = await fetchOpenFootball();
  } catch (error) {
    console.warn("[mundial] OpenFootball unavailable:", error);
  }

  try {
    footballDataMatches = await fetchFootballData();
  } catch (error) {
    console.warn("[mundial] football-data.org unavailable:", error);
  }

  try {
    espnMatches = await fetchEspnScores();
  } catch (error) {
    console.warn("[mundial] ESPN unavailable:", error);
  }

  const providerMatches =
    footballDataMatches.length > 0
      ? mergeMatches(footballDataMatches, espnMatches, false)
      : espnMatches;
  const providerSources = [
    espnMatches.length > 0 ? "espn" : null,
    footballDataMatches.length > 0 ? "football-data.org" : null,
  ].filter((source): source is string => source !== null);

  if (baseData && providerMatches.length > 0) {
    return {
      ...baseData,
      matches: mergeMatches(baseData.matches, providerMatches, false),
      source: [...providerSources, "openfootball"].join("+"),
      generatedAt: new Date().toISOString(),
    };
  }

  if (providerMatches.length > 0) {
    return {
      name: "World Cup 2026",
      matches: providerMatches,
      source: providerSources.join("+"),
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
// 45s mantiene a football-data.org por debajo de su limite de 10 req/min y
// permite que el polling de 60s reciba un marcador nuevo en cada vuelta.
export const getTournamentData = unstable_cache(
  buildTournamentData,
  ["mundial-tournament-data-v4"],
  { revalidate: 45 },
);

type FootballDataScorer = {
  player?: { name?: string | null };
  team?: FootballDataTeam;
  goals?: number | null;
  assists?: number | null;
  penalties?: number | null;
};

// Agrega los goles desde los "details" del scoreboard de ESPN (cada partido
// trae sus jugadas de gol con el autor). No incluye asistencias.
async function fetchEspnScorers(): Promise<Scorer[]> {
  const response = await fetch(ESPN_SCOREBOARD_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`ESPN HTTP ${response.status}`);

  const data = (await response.json()) as EspnResponse;
  const totals = new Map<string, Scorer>();

  for (const event of data.events ?? []) {
    const competition = event.competitions?.[0];
    if (!competition?.details?.length) continue;

    const teamNames = new Map<string, string>();
    for (const competitor of competition.competitors ?? []) {
      if (competitor.team?.id) {
        teamNames.set(competitor.team.id, normalizeEspnTeam(competitor));
      }
    }

    for (const detail of competition.details) {
      if (!detail.scoringPlay || detail.ownGoal || detail.shootout) continue;
      const name = detail.athletesInvolved?.[0]?.displayName;
      if (!name) continue;

      const team = teamNames.get(detail.team?.id ?? "") ?? "TBD";
      const key = `${name}|${team}`;
      const scorer = totals.get(key) ?? { name, team, goals: 0, assists: 0, penalties: 0 };
      scorer.goals += 1;
      if (detail.penaltyKick) scorer.penalties += 1;
      totals.set(key, scorer);
    }
  }

  return Array.from(totals.values()).sort(
    (a, b) => b.goals - a.goals || a.name.localeCompare(b.name),
  );
}

async function fetchFootballDataScorers(apiKey: string): Promise<Scorer[]> {
  const response = await fetch(FOOTBALL_DATA_SCORERS_URL, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`football-data.org scorers HTTP ${response.status}`);
  const data = (await response.json()) as { scorers?: FootballDataScorer[] };
  return (data.scorers ?? [])
    .filter((scorer) => scorer.player?.name)
    .map((scorer) => ({
      name: String(scorer.player?.name),
      team: normalizeTeam(scorer.team),
      goals: Number(scorer.goals) || 0,
      assists: Number(scorer.assists) || 0,
      penalties: Number(scorer.penalties) || 0,
    }));
}

async function fetchScorers(): Promise<Scorer[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (apiKey) {
    try {
      const scorers = await fetchFootballDataScorers(apiKey);
      if (scorers.length > 0) return scorers;
    } catch (error) {
      console.warn("[mundial] football-data scorers unavailable:", error);
    }
  }
  // Fallback (o complemento si football-data aun no tiene datos): ESPN.
  return fetchEspnScorers();
}

export const getTopScorers = unstable_cache(
  async () => {
    try {
      return await fetchScorers();
    } catch (error) {
      console.warn("[mundial] scorers unavailable:", error);
      return [];
    }
  },
  ["mundial-top-scorers"],
  { revalidate: 600 },
);
