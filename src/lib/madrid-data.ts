import { unstable_cache } from "next/cache";
import type {
  CompId,
  MadridData,
  MadridMatch,
  MadridResult,
  Scorer,
  SquadPlayer,
  StandingRow,
} from "@/app/apps/madrid/types";

// Real Madrid en ESPN: id 86. La API de ESPN por equipo es POR competicion,
// asi que consultamos cada liga y fusionamos para tener el calendario completo
// del club (LaLiga + Champions + Copa + Supercopa + Mundial de Clubes).
const ESPN_TEAM_ID = "86";
const ESPN_SITE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_WEB = "https://site.web.api.espn.com/apis/v2/sports/soccer";
const FOOTBALL_DATA_SCORERS_URL =
  "https://api.football-data.org/v4/competitions/PD/scorers?limit=100";

type LeagueConfig = { slug: string; comp: CompId; label: string };

const LEAGUES: LeagueConfig[] = [
  { slug: "esp.1", comp: "laliga", label: "LaLiga" },
  { slug: "uefa.champions", comp: "champions", label: "Champions" },
  { slug: "esp.copa_del_rey", comp: "copa", label: "Copa del Rey" },
  { slug: "esp.super_cup", comp: "supercopa", label: "Supercopa" },
  { slug: "fifa.cwc", comp: "mundialito", label: "Mundial de Clubes" },
];

// --- Tipado minimo de la respuesta de ESPN que consumimos ---
type EspnScore =
  | string
  | number
  | { value?: number | null; displayValue?: string | null }
  | null;

type EspnCompetitor = {
  homeAway?: "home" | "away";
  winner?: boolean;
  score?: EspnScore;
  shootoutScore?: number | string | null;
  team?: {
    id?: string;
    displayName?: string | null;
    shortDisplayName?: string | null;
    logo?: string | null;
    logos?: Array<{ href?: string | null }>;
  };
};

type EspnEvent = {
  id?: string;
  date?: string;
  competitions?: Array<{
    competitors?: EspnCompetitor[];
    venue?: { fullName?: string | null };
    status?: { type?: EspnStatusType };
    notes?: Array<{ headline?: string | null }>;
  }>;
  status?: { type?: EspnStatusType };
  season?: { type?: number };
};

type EspnStatusType = {
  state?: "pre" | "in" | "post";
  completed?: boolean;
  shortDetail?: string | null;
  detail?: string | null;
};

type EspnScheduleResponse = { events?: EspnEvent[] };

// Campana europea: si estamos en julio o mas tarde, la temporada arranca este
// mismo anio; si no, empezo el anio anterior.
function currentSeason(now = new Date()): number {
  const madridMonth = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Madrid",
      month: "numeric",
    }).format(now),
  );
  const madridYear = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Madrid",
      year: "numeric",
    }).format(now),
  );
  return madridMonth >= 7 ? madridYear : madridYear - 1;
}

function toScore(score: EspnScore | undefined): number | undefined {
  if (score === null || score === undefined) return undefined;
  if (typeof score === "number") return Number.isFinite(score) ? score : undefined;
  if (typeof score === "string") {
    const n = Number(score);
    return Number.isFinite(n) ? n : undefined;
  }
  if (typeof score.value === "number") return score.value;
  if (score.displayValue != null) {
    const n = Number(score.displayValue);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function toPens(competitor?: EspnCompetitor): number | undefined {
  const raw = competitor?.shootoutScore;
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

function teamLogo(competitor?: EspnCompetitor): string | undefined {
  return (
    competitor?.team?.logo ??
    competitor?.team?.logos?.[0]?.href ??
    undefined
  );
}

function statusOf(event: EspnEvent, competitionStatus?: EspnStatusType) {
  const type = competitionStatus ?? event.status?.type ?? {};
  const state = type.state;
  const status =
    state === "in" ? "live" : state === "post" || type.completed ? "finished" : "upcoming";
  return { status, detail: type.shortDetail ?? type.detail ?? undefined } as const;
}

function normalizeEvent(event: EspnEvent, league: LeagueConfig): MadridMatch | null {
  const competition = event.competitions?.[0];
  const home = competition?.competitors?.find((c) => c.homeAway === "home");
  const away = competition?.competitors?.find((c) => c.homeAway === "away");
  if (!home || !away || !event.date) return null;

  const kickoff = new Date(event.date);
  if (Number.isNaN(kickoff.getTime())) return null;

  const { status, detail } = statusOf(event, competition?.status?.type);
  const homeScore = status === "upcoming" ? undefined : toScore(home.score);
  const awayScore = status === "upcoming" ? undefined : toScore(away.score);

  const isMadridHome = home.team?.id === ESPN_TEAM_ID;
  const madridScore = isMadridHome ? homeScore : awayScore;
  const rivalScore = isMadridHome ? awayScore : homeScore;

  let result: MadridResult | undefined;
  if (status === "finished" && madridScore !== undefined && rivalScore !== undefined) {
    result = madridScore > rivalScore ? "W" : madridScore < rivalScore ? "L" : "D";
  }

  return {
    id: `${league.comp}-${event.id ?? `${event.date}-${home.team?.id}`}`,
    comp: league.comp,
    compLabel: league.label,
    round: competition?.notes?.[0]?.headline ?? undefined,
    startsAt: kickoff.toISOString(),
    date: kickoff.toISOString().slice(0, 10),
    home: home.team?.displayName ?? home.team?.shortDisplayName ?? "?",
    away: away.team?.displayName ?? away.team?.shortDisplayName ?? "?",
    homeLogo: teamLogo(home),
    awayLogo: teamLogo(away),
    venue: competition?.venue?.fullName ?? undefined,
    status,
    statusDetail: detail,
    homeScore,
    awayScore,
    homePens: toPens(home),
    awayPens: toPens(away),
    isMadridHome,
    rival: (isMadridHome ? away.team?.displayName : home.team?.displayName) ?? "?",
    rivalLogo: teamLogo(isMadridHome ? away : home),
    result,
  };
}

async function fetchLeague(league: LeagueConfig, season: number): Promise<MadridMatch[]> {
  const url = `${ESPN_SITE}/${league.slug}/teams/${ESPN_TEAM_ID}/schedule?season=${season}`;
  const response = await fetch(url, { next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`ESPN ${league.slug} HTTP ${response.status}`);
  const data = (await response.json()) as EspnScheduleResponse;
  return (data.events ?? [])
    .map((event) => normalizeEvent(event, league))
    .filter((match): match is MadridMatch => match !== null);
}

async function fetchAllLeagues(season: number): Promise<MadridMatch[]> {
  const results = await Promise.allSettled(
    LEAGUES.map((league) => fetchLeague(league, season)),
  );
  const matches: MadridMatch[] = [];
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") {
      matches.push(...result.value);
    } else {
      console.warn(`[madrid] ${LEAGUES[index].slug} unavailable:`, result.reason);
    }
  }
  // Deduplica por id y ordena cronologicamente.
  const byId = new Map(matches.map((match) => [match.id, match]));
  return Array.from(byId.values()).sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  );
}

async function buildMadridData(): Promise<MadridData> {
  const season = currentSeason();
  let matches = await fetchAllLeagues(season);
  let usedSeason = season;

  // En pretemporada la campana nueva aun no tiene partidos publicados: caemos a
  // la anterior para no mostrar una app vacia.
  if (matches.length < 5) {
    const previous = await fetchAllLeagues(season - 1);
    if (previous.length > matches.length) {
      matches = previous;
      usedSeason = season - 1;
    }
  }

  return {
    matches,
    season: usedSeason,
    source: "espn",
    generatedAt: new Date().toISOString(),
  };
}

// Cache compartido (Next data cache). 45 s deja que el polling de 60 s del
// cliente reciba marcadores frescos en dia de partido sin martillear a ESPN.
export const getMadridData = unstable_cache(buildMadridData, ["madrid-data-v1"], {
  revalidate: 45,
});

// --- Clasificacion de LaLiga (fuente keyless: standings de ESPN) ---
type EspnStanding = {
  team?: { id?: string; displayName?: string | null; logos?: Array<{ href?: string | null }> };
  stats?: Array<{ name?: string; value?: number; displayValue?: string }>;
};

function stat(entry: EspnStanding, name: string): number {
  const found = entry.stats?.find((s) => s.name === name);
  if (!found) return 0;
  if (typeof found.value === "number") return found.value;
  const n = Number(found.displayValue);
  return Number.isFinite(n) ? n : 0;
}

async function buildStandings(): Promise<StandingRow[]> {
  const season = currentSeason();
  for (const target of [season, season - 1]) {
    try {
      const response = await fetch(
        `${ESPN_WEB}/esp.1/standings?season=${target}`,
        { next: { revalidate: 300 } },
      );
      if (!response.ok) continue;
      const data = (await response.json()) as {
        children?: Array<{ standings?: { entries?: EspnStanding[] } }>;
        standings?: { entries?: EspnStanding[] };
      };
      const entries =
        data.children?.[0]?.standings?.entries ?? data.standings?.entries ?? [];
      if (entries.length === 0) continue;
      // En pretemporada ESPN ya publica la tabla nueva con todo a 0; si aun no
      // se ha jugado nada, caemos a la temporada anterior (tabla final util).
      const anyPlayed = entries.some((entry) => stat(entry, "gamesPlayed") > 0);
      if (!anyPlayed && target === season) continue;

      const rows = entries.map((entry) => ({
        team: entry.team?.displayName ?? "?",
        logo: entry.team?.logos?.[0]?.href ?? undefined,
        isMadrid: entry.team?.id === ESPN_TEAM_ID,
        played: stat(entry, "gamesPlayed"),
        wins: stat(entry, "wins"),
        draws: stat(entry, "ties"),
        losses: stat(entry, "losses"),
        goalsFor: stat(entry, "pointsFor"),
        goalsAgainst: stat(entry, "pointsAgainst"),
        goalDifference: stat(entry, "pointDifferential"),
        points: stat(entry, "points"),
        rank: stat(entry, "rank"),
      }));
      // ESPN a veces no ordena; ordenamos por puntos y diferencia de goles.
      rows.sort(
        (a, b) =>
          b.points - a.points ||
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor,
      );
      return rows.map((row, index) => ({ ...row, rank: index + 1 }));
    } catch (error) {
      console.warn("[madrid] standings unavailable:", error);
    }
  }
  return [];
}

export const getLaligaStandings = unstable_cache(buildStandings, ["madrid-standings-v1"], {
  revalidate: 300,
});

// --- Plantilla (fuente keyless: roster de ESPN) ---
type EspnAthlete = {
  displayName?: string | null;
  fullName?: string | null;
  jersey?: string | null;
  age?: number | null;
  position?: { name?: string | null; abbreviation?: string | null };
  citizenship?: string | null;
  flag?: { alt?: string | null };
};

const POSITION_GROUPS: Record<string, string> = {
  G: "Porteros",
  D: "Defensas",
  M: "Centrocampistas",
  F: "Delanteros",
};

function positionGroup(abbr?: string | null): string {
  if (!abbr) return "Otros";
  return POSITION_GROUPS[abbr[0]?.toUpperCase()] ?? "Otros";
}

async function buildSquad(): Promise<SquadPlayer[]> {
  const season = currentSeason();
  for (const target of [season, season - 1]) {
    try {
      const response = await fetch(
        `${ESPN_SITE}/esp.1/teams/${ESPN_TEAM_ID}/roster?season=${target}`,
        { next: { revalidate: 3600 } },
      );
      if (!response.ok) continue;
      const data = (await response.json()) as { athletes?: EspnAthlete[] };
      const athletes = data.athletes ?? [];
      if (athletes.length === 0) continue;

      return athletes
        .filter((athlete) => athlete.displayName)
        .map((athlete) => ({
          name: athlete.displayName as string,
          position: positionGroup(athlete.position?.abbreviation),
          positionAbbr: athlete.position?.abbreviation ?? "",
          number: athlete.jersey ? Number(athlete.jersey) || undefined : undefined,
          age: typeof athlete.age === "number" ? athlete.age : undefined,
        }));
    } catch (error) {
      console.warn("[madrid] squad unavailable:", error);
    }
  }
  return [];
}

export const getSquad = unstable_cache(buildSquad, ["madrid-squad-v1"], {
  revalidate: 3600,
});

// --- Goleadores del Madrid en LaLiga (football-data.org; requiere API key) ---
type FootballDataScorer = {
  player?: { name?: string | null };
  team?: { id?: number; name?: string | null };
  goals?: number | null;
  assists?: number | null;
  penalties?: number | null;
};

async function buildScorers(): Promise<Scorer[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return [];
  try {
    const response = await fetch(FOOTBALL_DATA_SCORERS_URL, {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 600 },
    });
    if (!response.ok) throw new Error(`football-data scorers HTTP ${response.status}`);
    const data = (await response.json()) as { scorers?: FootballDataScorer[] };
    return (data.scorers ?? [])
      .filter(
        (scorer) =>
          scorer.player?.name &&
          (scorer.team?.id === 86 || /real madrid/i.test(scorer.team?.name ?? "")),
      )
      .map((scorer) => ({
        name: String(scorer.player?.name),
        goals: Number(scorer.goals) || 0,
        assists: Number(scorer.assists) || 0,
        penalties: Number(scorer.penalties) || 0,
      }))
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
  } catch (error) {
    console.warn("[madrid] scorers unavailable:", error);
    return [];
  }
}

export const getMadridScorers = unstable_cache(buildScorers, ["madrid-scorers-v1"], {
  revalidate: 600,
});
