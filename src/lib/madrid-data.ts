import { unstable_cache } from "next/cache";
import type {
  ChampionsStandings,
  CompId,
  LeagueCalendar,
  LeagueId,
  LeagueMatch,
  LiveEvent,
  LiveLineupPlayer,
  MadridData,
  MatchStatus,
  MadridMatch,
  MadridResult,
  MatchDetail,
  MatchLive,
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
  const direct = competitor?.team?.logo ?? competitor?.team?.logos?.[0]?.href;
  if (direct) return direct;
  // Fallback: escudo por id en el CDN de ESPN (algunos eventos del scoreboard
  // vienen sin logo, sobre todo los futuros).
  const id = competitor?.team?.id;
  return id ? `https://a.espncdn.com/i/teamlogos/soccer/500/${id}.png` : undefined;
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
    espnId: event.id ? String(event.id) : undefined,
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

// Rango de fechas ESPN "YYYYMMDD-YYYYMMDD" desde hoy hasta +days.
function espnDateRange(days: number): string {
  const now = new Date();
  const start = now.toISOString().slice(0, 10).replaceAll("-", "");
  const end = new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10).replaceAll("-", "");
  return `${start}-${end}`;
}

// El endpoint "schedule por equipo" de ESPN va vacio en pretemporada, pero el
// "scoreboard" por liga y fechas ya trae el calendario nuevo. Consultamos cada
// liga en la ventana proxima y filtramos los partidos del Madrid.
async function fetchLeagueScoreboard(league: LeagueConfig): Promise<MadridMatch[]> {
  const url = `${ESPN_SITE}/${league.slug}/scoreboard?dates=${espnDateRange(180)}&limit=200`;
  const response = await fetch(url, { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`ESPN scoreboard ${league.slug} HTTP ${response.status}`);
  const data = (await response.json()) as EspnScheduleResponse;
  return (data.events ?? [])
    .filter((event) =>
      event.competitions?.[0]?.competitors?.some((c) => c.team?.id === ESPN_TEAM_ID),
    )
    .map((event) => normalizeEvent(event, league))
    .filter((match): match is MadridMatch => match !== null);
}

async function fetchAllScoreboards(): Promise<MadridMatch[]> {
  const results = await Promise.allSettled(LEAGUES.map((league) => fetchLeagueScoreboard(league)));
  const matches: MadridMatch[] = [];
  for (const [index, result] of results.entries()) {
    if (result.status === "fulfilled") matches.push(...result.value);
    else console.warn(`[madrid] scoreboard ${LEAGUES[index].slug} unavailable:`, result.reason);
  }
  const byId = new Map(matches.map((match) => [match.id, match]));
  return Array.from(byId.values());
}

// --- Proximos partidos via football-data.org (requiere API key) ---
// Publica el calendario de LaLiga/Champions normalmente antes que ESPN.
type FootballDataTeam = {
  id?: number;
  name?: string | null;
  shortName?: string | null;
  crest?: string | null;
};
type FootballDataTeamMatch = {
  id?: number;
  utcDate: string;
  status: string;
  stage?: string | null;
  competition?: { code?: string | null; name?: string | null };
  homeTeam: FootballDataTeam;
  awayTeam: FootballDataTeam;
  score?: { fullTime?: { home?: number | null; away?: number | null } };
};

const FD_COMP: Record<string, { comp: CompId; label: string }> = {
  PD: { comp: "laliga", label: "LaLiga" },
  CL: { comp: "champions", label: "Champions" },
  CDR: { comp: "copa", label: "Copa del Rey" },
};

function normalizeFootballDataMatch(match: FootballDataTeamMatch): MadridMatch | null {
  const code = match.competition?.code ?? "";
  const mapped = FD_COMP[code];
  if (!mapped) return null; // ignoramos competiciones no relevantes
  const kickoff = new Date(match.utcDate);
  if (Number.isNaN(kickoff.getTime())) return null;

  const status =
    match.status === "IN_PLAY" || match.status === "PAUSED"
      ? "live"
      : match.status === "FINISHED"
        ? "finished"
        : "upcoming";
  const isMadridHome = match.homeTeam.id === 86;
  const home = match.homeTeam.name ?? match.homeTeam.shortName ?? "?";
  const away = match.awayTeam.name ?? match.awayTeam.shortName ?? "?";
  const homeScore = status === "upcoming" ? undefined : match.score?.fullTime?.home ?? undefined;
  const awayScore = status === "upcoming" ? undefined : match.score?.fullTime?.away ?? undefined;

  let result: MadridResult | undefined;
  const madridScore = isMadridHome ? homeScore : awayScore;
  const rivalScore = isMadridHome ? awayScore : homeScore;
  if (status === "finished" && madridScore != null && rivalScore != null) {
    result = madridScore > rivalScore ? "W" : madridScore < rivalScore ? "L" : "D";
  }

  return {
    id: `${mapped.comp}-fd-${match.id ?? match.utcDate}`,
    comp: mapped.comp,
    compLabel: mapped.label,
    round: match.stage && match.stage !== "REGULAR_SEASON" ? match.stage.replaceAll("_", " ") : undefined,
    startsAt: kickoff.toISOString(),
    date: kickoff.toISOString().slice(0, 10),
    home,
    away,
    homeLogo: match.homeTeam.crest ?? undefined,
    awayLogo: match.awayTeam.crest ?? undefined,
    status,
    homeScore: homeScore ?? undefined,
    awayScore: awayScore ?? undefined,
    isMadridHome,
    rival: isMadridHome ? away : home,
    rivalLogo: (isMadridHome ? match.awayTeam.crest : match.homeTeam.crest) ?? undefined,
    result,
  };
}

async function fetchFootballDataUpcoming(): Promise<MadridMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return [];
  try {
    const response = await fetch(
      "https://api.football-data.org/v4/teams/86/matches?status=SCHEDULED",
      { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 300 } },
    );
    if (!response.ok) throw new Error(`football-data matches HTTP ${response.status}`);
    const data = (await response.json()) as { matches?: FootballDataTeamMatch[] };
    return (data.matches ?? [])
      .map(normalizeFootballDataMatch)
      .filter((match): match is MadridMatch => match !== null);
  } catch (error) {
    console.warn("[madrid] football-data upcoming unavailable:", error);
    return [];
  }
}

// Fusiona dos listas de partidos evitando duplicados. Clave: competicion + dia
// (el Madrid no juega dos veces la misma competicion el mismo dia). Se prioriza
// la primera lista (normalmente ESPN, con logos y estado mas rico).
function mergeCalendar(primary: MadridMatch[], secondary: MadridMatch[]): MadridMatch[] {
  const byKey = new Map<string, MadridMatch>();
  const keyOf = (m: MadridMatch) => `${m.comp}|${m.date}`;
  for (const match of primary) byKey.set(keyOf(match), match);
  for (const match of secondary) {
    const key = keyOf(match);
    if (!byKey.has(key)) byKey.set(key, match);
  }
  return Array.from(byKey.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

async function buildMadridData(): Promise<MadridData> {
  const season = currentSeason();

  // Fuentes: (1) schedule por equipo de ESPN (resultados de la campana actual),
  // (2) scoreboard por liga de ESPN, que ya trae el calendario nuevo cuando el
  // schedule por equipo aun va vacio, y (3) proximos de football-data.org.
  const [espnCurrent, espnUpcoming, fdUpcoming] = await Promise.all([
    fetchAllLeagues(season),
    fetchAllScoreboards(),
    fetchFootballDataUpcoming(),
  ]);

  let matches = mergeCalendar(mergeCalendar(espnCurrent, espnUpcoming), fdUpcoming);
  let usedSeason = season;

  // Si la campana nueva aun no tiene NADA publicado, mostramos solo los ultimos
  // resultados de la anterior como contexto (no toda la temporada antigua).
  if (matches.length === 0) {
    const previous = await fetchAllLeagues(season - 1);
    const recent = previous.filter((m) => m.status === "finished").slice(-8);
    matches = mergeCalendar(recent, fdUpcoming);
    usedSeason = recent.length > 0 ? season - 1 : season;
  }

  // Cruza con footballdata.io por fecha para poder abrir el detalle del partido.
  const detailIndex = await getFdioMatchIndex();
  if (Object.keys(detailIndex).length > 0) {
    matches = matches.map((match) =>
      detailIndex[match.date] ? { ...match, detailId: detailIndex[match.date] } : match,
    );
  }

  return {
    matches,
    season: usedSeason,
    source: fdUpcoming.length > 0 ? "espn+football-data" : "espn",
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

// Clasificacion de una competicion via ESPN (keyless). Devuelve tambien la
// temporada usada, para saber si es la actual o la anterior (pretemporada).
async function buildEspnStandings(slug: string): Promise<{ rows: StandingRow[]; season: number }> {
  const season = currentSeason();
  for (const target of [season, season - 1]) {
    try {
      const response = await fetch(`${ESPN_WEB}/${slug}/standings?season=${target}`, {
        next: { revalidate: 300 },
      });
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
      return { rows: rows.map((row, index) => ({ ...row, rank: index + 1 })), season: target };
    } catch (error) {
      console.warn(`[madrid] standings ${slug} unavailable:`, error);
    }
  }
  return { rows: [], season };
}

export const getLaligaStandings = unstable_cache(
  async () => (await buildEspnStandings("esp.1")).rows,
  ["madrid-standings-v2"],
  { revalidate: 300 },
);

// Clasificacion de la Champions (fase liga de 36). En pretemporada la 26/27 aun
// no esta sorteada, asi que buildEspnStandings cae a la 25/26 (con el Madrid).
async function buildChampionsStandings(): Promise<ChampionsStandings> {
  const { rows, season } = await buildEspnStandings("uefa.champions");
  return {
    rows,
    isPrevious: season < currentSeason(),
    seasonYear: rows.length > 0 ? season * 10000 + (season + 1) : undefined,
  };
}

export const getChampionsStandings = unstable_cache(
  buildChampionsStandings,
  ["madrid-champions-standings-v2"],
  { revalidate: 21600 },
);

// --- footballdata.io: fotos + goles/asistencias por jugador ---
// Plan free: 1000 req/mes, asi que se cachea 12 h y se comparte entre plantilla
// y goleadores. Cobertura parcial (solo jugadores con minutos en las ligas del
// plan), por eso se usa como CAPA sobre el roster completo de ESPN.
const FDIO_BASE = "https://footballdata.io/api/v1";
const FDIO_TEAM_ID = 78;

type FdioPlayer = {
  player_id?: number;
  player_name?: string;
  known_name?: string;
  first_name?: string;
  last_name?: string;
  player_image?: string;
  stats?: {
    goals?: number | null;
    assists?: number | null;
    minutes?: number | null;
    appearances?: number | null;
  };
};

export type FdioAgg = {
  name: string;
  photo?: string;
  goals: number;
  assists: number;
  minutes: number;
  appearances: number;
};

function normName(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

async function fetchFdioPlayers(): Promise<FdioPlayer[]> {
  const key = process.env.FOOTBALLDATA_IO_KEY;
  if (!key) return [];
  try {
    const response = await fetch(`${FDIO_BASE}/teams/${FDIO_TEAM_ID}/players?limit=100`, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 43200 }, // 12 h
    });
    if (!response.ok) throw new Error(`footballdata.io players HTTP ${response.status}`);
    const json = (await response.json()) as { data?: { players?: FdioPlayer[] } };
    return Array.isArray(json.data?.players) ? json.data.players : [];
  } catch (error) {
    console.warn("[madrid] footballdata.io players unavailable:", error);
    return [];
  }
}

const getFdioPlayers = unstable_cache(fetchFdioPlayers, ["madrid-fdio-players-v1"], {
  revalidate: 43200,
});

// Agrega las filas por jugador (el endpoint devuelve una por competicion) y
// deja un indice por nombre normalizado para cruzarlo con el roster de ESPN.
async function getFdioByName(): Promise<Map<string, FdioAgg>> {
  const players = await getFdioPlayers();
  const byId = new Map<number, FdioAgg & { keys: Set<string> }>();
  for (const player of players) {
    const id = player.player_id;
    if (id == null) continue;
    const entry =
      byId.get(id) ??
      ({ name: player.known_name ?? player.player_name ?? "", goals: 0, assists: 0, minutes: 0, appearances: 0, keys: new Set<string>() } as FdioAgg & { keys: Set<string> });
    entry.goals += Number(player.stats?.goals) || 0;
    entry.assists += Number(player.stats?.assists) || 0;
    entry.minutes += Number(player.stats?.minutes) || 0;
    entry.appearances += Number(player.stats?.appearances) || 0;
    const image = player.player_image ?? "";
    if (image && !image.includes("default") && !entry.photo) entry.photo = image;
    for (const candidate of [player.known_name, player.player_name, `${player.first_name ?? ""} ${player.last_name ?? ""}`]) {
      if (candidate && candidate.trim()) entry.keys.add(normName(candidate));
    }
    byId.set(id, entry);
  }
  const byName = new Map<string, FdioAgg>();
  for (const entry of byId.values()) {
    const agg: FdioAgg = {
      name: entry.name,
      photo: entry.photo,
      goals: entry.goals,
      assists: entry.assists,
      minutes: entry.minutes,
      appearances: entry.appearances,
    };
    for (const key of entry.keys) byName.set(key, agg);
  }
  return byName;
}

// Indice fecha -> match_id de footballdata.io, para poder abrir el detalle de
// un partido del calendario (que viene de ESPN, con otros ids).
type FdioTeamMatch = { match_id?: number; match_date?: string; date_unix?: number };

async function fetchFdioMatchIndex(): Promise<Record<string, number>> {
  const key = process.env.FOOTBALLDATA_IO_KEY;
  if (!key) return {};
  try {
    const response = await fetch(`${FDIO_BASE}/teams/${FDIO_TEAM_ID}/matches?limit=100`, {
      headers: { Authorization: `Bearer ${key}` },
      next: { revalidate: 21600 }, // 6 h
    });
    if (!response.ok) throw new Error(`footballdata.io matches HTTP ${response.status}`);
    const json = (await response.json()) as { data?: FdioTeamMatch[] | { matches?: FdioTeamMatch[] } };
    const rows = Array.isArray(json.data) ? json.data : json.data?.matches ?? [];
    const index: Record<string, number> = {};
    for (const row of rows) {
      if (row.match_id == null) continue;
      if (row.match_date) index[row.match_date.slice(0, 10)] = row.match_id;
      if (row.date_unix) index[new Date(row.date_unix * 1000).toISOString().slice(0, 10)] = row.match_id;
    }
    return index;
  } catch (error) {
    console.warn("[madrid] footballdata.io match index unavailable:", error);
    return {};
  }
}

const getFdioMatchIndex = unstable_cache(fetchFdioMatchIndex, ["madrid-fdio-match-index-v2"], {
  revalidate: 21600,
});

// --- Detalle de un partido (footballdata.io) ---
type FdioLineupPlayer = {
  known_name?: string;
  player_name?: string;
  shirt_number?: number | null;
  position_name?: string | null;
  player_image?: string | null;
};
type FdioMatchDetailRaw = {
  match_id?: number;
  game_week?: number | null;
  league?: { league_name?: string | null; name?: string | null };
  home_team?: { team_name?: string | null; team_logo?: string | null };
  away_team?: { team_name?: string | null; team_logo?: string | null };
  score?: { home?: number | null; away?: number | null };
  venue?: { name?: string | null; attendance?: number | null };
  xg?: { home?: number | null; away?: number | null };
  stats?: {
    possession?: { home?: number; away?: number };
    shots?: { home_total?: number; away_total?: number; home_on_target?: number; away_on_target?: number };
    corners?: { home?: number; away?: number };
    fouls?: { home?: number; away?: number };
    offsides?: { home?: number; away?: number };
    cards?: { home_total?: number; away_total?: number };
  };
  lineups?: { home?: FdioLineupPlayer[]; away?: FdioLineupPlayer[] };
};
type FdioEvent = {
  minute?: number | null;
  extra_minute?: number | null;
  team_side?: "home" | "away";
  event_type?: string;
  player?: { player_name?: string | null };
  assist?: { player_name?: string | null } | null;
};

function mapLineup(players?: FdioLineupPlayer[]) {
  return (players ?? []).map((player) => ({
    name: player.known_name ?? player.player_name ?? "?",
    number: typeof player.shirt_number === "number" ? player.shirt_number : undefined,
    position: player.position_name ?? undefined,
    photo: player.player_image && !player.player_image.includes("default") ? player.player_image : undefined,
  }));
}

function statItem(label: string, home?: number, away?: number, suffix?: string) {
  return { label, home: Number(home) || 0, away: Number(away) || 0, ...(suffix ? { suffix } : {}) };
}

async function fetchMatchDetail(id: number): Promise<MatchDetail | null> {
  const key = process.env.FOOTBALLDATA_IO_KEY;
  if (!key) return null;
  const headers = { Authorization: `Bearer ${key}` };
  try {
    const [detailRes, eventsRes] = await Promise.all([
      fetch(`${FDIO_BASE}/matches/${id}`, { headers, next: { revalidate: 3600 } }),
      fetch(`${FDIO_BASE}/matches/${id}/events`, { headers, next: { revalidate: 3600 } }),
    ]);
    if (!detailRes.ok) throw new Error(`footballdata.io match HTTP ${detailRes.status}`);
    const detail = ((await detailRes.json()) as { data?: FdioMatchDetailRaw }).data;
    if (!detail) return null;
    const events = eventsRes.ok
      ? ((await eventsRes.json()) as { data?: { events?: FdioEvent[] } }).data?.events ?? []
      : [];

    const goals = events
      .filter((event) => (event.event_type ?? "").includes("goal"))
      .map((event) => ({
        minute: Number(event.minute) || 0,
        extra: event.extra_minute ? Number(event.extra_minute) : undefined,
        side: event.team_side ?? "home",
        player: event.player?.player_name ?? "?",
        assist: event.assist?.player_name ?? undefined,
      }))
      .sort((a, b) => a.minute + (a.extra ?? 0) - (b.minute + (b.extra ?? 0)));

    const s = detail.stats ?? {};
    const stats = [
      statItem("Posesión", s.possession?.home, s.possession?.away, "%"),
      statItem("Tiros", s.shots?.home_total, s.shots?.away_total),
      statItem("Tiros a puerta", s.shots?.home_on_target, s.shots?.away_on_target),
      statItem("Córners", s.corners?.home, s.corners?.away),
      statItem("Faltas", s.fouls?.home, s.fouls?.away),
      statItem("Fueras de juego", s.offsides?.home, s.offsides?.away),
      statItem("Tarjetas", s.cards?.home_total, s.cards?.away_total),
    ].filter((item) => item.home > 0 || item.away > 0);

    return {
      id: detail.match_id ?? id,
      home: detail.home_team?.team_name ?? "?",
      away: detail.away_team?.team_name ?? "?",
      homeLogo: detail.home_team?.team_logo ?? undefined,
      awayLogo: detail.away_team?.team_logo ?? undefined,
      homeScore: detail.score?.home ?? undefined,
      awayScore: detail.score?.away ?? undefined,
      competition: detail.league?.league_name ?? detail.league?.name ?? undefined,
      gameWeek: detail.game_week ?? undefined,
      venue: detail.venue?.name ?? undefined,
      attendance:
        typeof detail.venue?.attendance === "number" && detail.venue.attendance > 0
          ? detail.venue.attendance
          : undefined,
      goals,
      lineups: { home: mapLineup(detail.lineups?.home), away: mapLineup(detail.lineups?.away) },
      stats,
      ...(typeof detail.xg?.home === "number" && typeof detail.xg?.away === "number"
        ? { xg: { home: detail.xg.home, away: detail.xg.away } }
        : {}),
    };
  } catch (error) {
    console.warn(`[madrid] match detail ${id} unavailable:`, error);
    return null;
  }
}

export async function getMatchDetail(id: number): Promise<MatchDetail | null> {
  return unstable_cache(() => fetchMatchDetail(id), ["madrid-match-detail", String(id)], {
    revalidate: 3600,
  })();
}

// --- Plantilla (fuente keyless: roster de ESPN) ---
type EspnAthlete = {
  displayName?: string | null;
  fullName?: string | null;
  jersey?: string | null;
  age?: number | null;
  height?: number | null; // pulgadas
  weight?: number | null; // libras
  position?: { name?: string | null; abbreviation?: string | null };
  citizenship?: string | null;
  flag?: { href?: string | null; alt?: string | null };
};

const POSITION_GROUPS: Record<string, string> = {
  G: "Porteros",
  D: "Defensas",
  M: "Centrocampistas",
  F: "Delanteros",
};

const POSITION_NAMES: Record<string, string> = {
  Goalkeeper: "Portero",
  Defender: "Defensa",
  Midfielder: "Centrocampista",
  Forward: "Delantero",
};

function positionGroup(abbr?: string | null): string {
  if (!abbr) return "Otros";
  return POSITION_GROUPS[abbr[0]?.toUpperCase()] ?? "Otros";
}

function heightLabel(inches?: number | null): string | undefined {
  if (typeof inches !== "number" || inches <= 0) return undefined;
  const meters = (inches * 0.0254).toFixed(2).replace(".", ",");
  return `${meters} m`;
}

function weightLabel(pounds?: number | null): string | undefined {
  if (typeof pounds !== "number" || pounds <= 0) return undefined;
  return `${Math.round(pounds * 0.453592)} kg`;
}

// Las fotos de footballdata.io estan en URL predecible
// (/img/player/{pais}-{nombre}.png). Para los jugadores que su endpoint de
// equipo no devuelve (solo trae ~11), construimos la URL desde el nombre y la
// nacionalidad de ESPN; si no existe, el <img> cae a las iniciales (onError).
function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const NATIONALITY_SLUG: Record<string, string> = {
  turkiye: "turkey",
  "korea-republic": "south-korea",
  "cote-d-ivoire": "ivory-coast",
};

// Algunos nombres de ESPN no coinciden con el slug de footballdata.io.
const PHOTO_NAME_ALIAS: Record<string, string> = {
  "dani-carvajal": "daniel-carvajal",
};

function fdioPhotoUrl(name: string, nationality?: string): string | undefined {
  if (!nationality) return undefined;
  const natRaw = slugify(nationality);
  const nat = NATIONALITY_SLUG[natRaw] ?? natRaw;
  const nameSlug = PHOTO_NAME_ALIAS[slugify(name)] ?? slugify(name);
  if (!nat || !nameSlug) return undefined;
  return `https://footballdata.io/img/player/${nat}-${nameSlug}.png`;
}

async function fetchEspnRoster(): Promise<EspnAthlete[]> {
  const season = currentSeason();
  for (const target of [season, season - 1]) {
    try {
      const response = await fetch(
        `${ESPN_SITE}/esp.1/teams/${ESPN_TEAM_ID}/roster?season=${target}`,
        { next: { revalidate: 3600 } },
      );
      if (!response.ok) continue;
      const data = (await response.json()) as { athletes?: EspnAthlete[] };
      const athletes = (data.athletes ?? []).filter((a) => a.displayName);
      if (athletes.length > 0) return athletes;
    } catch (error) {
      console.warn("[madrid] roster unavailable:", error);
    }
  }
  return [];
}

// Clave de cruce entre fuentes: apellido + inicial del nombre (API-Football
// abrevia el nombre, p.ej. "F. Valverde"; ESPN lo trae completo).
function squadKey(name: string): string {
  const parts = name.replace(/\./g, " ").trim().split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] ?? "";
  const firstInitial = (parts[0] ?? "").charAt(0);
  return `${normName(last)}|${normName(firstInitial)}`;
}

type EspnBio = {
  name: string;
  country?: string;
  flag?: string;
  height?: string;
  weight?: string;
  age?: number;
};

function buildEspnBio(athletes: EspnAthlete[]): Map<string, EspnBio> {
  const map = new Map<string, EspnBio>();
  for (const athlete of athletes) {
    const name = athlete.displayName as string;
    map.set(squadKey(name), {
      name,
      country: athlete.citizenship ?? athlete.flag?.alt ?? undefined,
      flag: athlete.flag?.href ?? undefined,
      height: heightLabel(athlete.height),
      weight: weightLabel(athlete.weight),
      age: typeof athlete.age === "number" ? athlete.age : undefined,
    });
  }
  return map;
}

// --- Plantilla oficial + fotos actualizadas (API-Football / api-sports.io) ---
const API_FOOTBALL_TEAM = 541; // Real Madrid en API-Football

type ApiFootballPlayer = {
  id?: number;
  name?: string;
  age?: number | null;
  number?: number | null;
  position?: string | null;
  photo?: string | null;
};

const AF_POSITION_GROUP: Record<string, string> = {
  Goalkeeper: "Porteros",
  Defender: "Defensas",
  Midfielder: "Centrocampistas",
  Attacker: "Delanteros",
};
const AF_POSITION_NAME: Record<string, string> = {
  Goalkeeper: "Portero",
  Defender: "Defensa",
  Midfielder: "Centrocampista",
  Attacker: "Delantero",
};

async function fetchApiFootballSquad(): Promise<ApiFootballPlayer[]> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return [];
  try {
    const response = await fetch(
      `https://v3.football.api-sports.io/players/squads?team=${API_FOOTBALL_TEAM}`,
      { headers: { "x-apisports-key": key }, next: { revalidate: 86400 } },
    );
    if (!response.ok) throw new Error(`API-Football squad HTTP ${response.status}`);
    const data = (await response.json()) as {
      response?: Array<{ players?: ApiFootballPlayer[] }>;
    };
    return data.response?.[0]?.players ?? [];
  } catch (error) {
    console.warn("[madrid] API-Football squad unavailable:", error);
    return [];
  }
}

// Plan free 100 req/dia: cache 24 h.
const getApiFootballSquad = unstable_cache(fetchApiFootballSquad, ["madrid-af-squad-v1"], {
  revalidate: 86400,
});

// La plantilla de API-Football mezcla primer equipo + Castilla (numeros
// duplicados) y algun jugador sin dorsal que no es del club (ruido). Nos
// quedamos con el primer equipo: dorsal presente y <= 30 (o que haya jugado
// segun footballdata.io), y ante un mismo numero preferimos al que ha jugado o,
// en su defecto, al mayor (los canteranos comparten dorsal con su titular).
function firstTeamOnly(players: SquadPlayer[]): SquadPlayer[] {
  const played = (p: SquadPlayer) => (p.minutes ?? 0) > 0 || (p.goals ?? 0) > 0;
  const eligible = players.filter(
    (p) => typeof p.number === "number" && (p.number <= 30 || played(p)),
  );
  const byNumber = new Map<number, SquadPlayer>();
  const score = (p: SquadPlayer) => (played(p) ? 1000 : 0) + (p.age ?? 0);
  for (const player of eligible) {
    const current = byNumber.get(player.number as number);
    if (!current || score(player) > score(current)) {
      byNumber.set(player.number as number, player);
    }
  }
  return Array.from(byNumber.values());
}

async function buildSquad(): Promise<SquadPlayer[]> {
  const [apiSquad, roster, fdio] = await Promise.all([
    getApiFootballSquad(),
    fetchEspnRoster(),
    getFdioByName(),
  ]);

  // Fuente principal: plantilla oficial de API-Football (foto al dia + dorsal),
  // enriquecida con bio de ESPN (nacionalidad/altura/peso/nombre completo) y
  // stats de footballdata.io (goles/asistencias/minutos).
  if (apiSquad.length > 0) {
    const bio = buildEspnBio(roster);
    const mapped = apiSquad
      .filter((player) => player.name)
      .map((player) => {
        const apiName = player.name as string;
        const espn = bio.get(squadKey(apiName));
        const name = espn?.name ?? apiName;
        const stats = fdio.get(normName(name)) ?? fdio.get(normName(apiName));
        const position = player.position ?? "";
        return {
          name,
          position: AF_POSITION_GROUP[position] ?? "Otros",
          positionName: AF_POSITION_NAME[position] ?? position,
          positionAbbr: "",
          number: typeof player.number === "number" ? player.number : undefined,
          age: player.age ?? espn?.age,
          height: espn?.height,
          weight: espn?.weight,
          country: espn?.country,
          countryFlag: espn?.flag,
          photo: player.photo ?? stats?.photo ?? fdioPhotoUrl(name, espn?.country),
          goals: stats?.goals ? stats.goals : undefined,
          assists: stats?.assists ? stats.assists : undefined,
          minutes: stats?.minutes ? stats.minutes : undefined,
          appearances: stats?.appearances ? stats.appearances : undefined,
        };
      });
    return firstTeamOnly(mapped);
  }

  // Fallback sin API-Football: roster de ESPN + capa de footballdata.io.
  return roster.map((athlete) => {
    const name = athlete.displayName as string;
    const extra = fdio.get(normName(name));
    return {
      name,
      position: positionGroup(athlete.position?.abbreviation),
      positionName:
        POSITION_NAMES[athlete.position?.name ?? ""] ??
        positionGroup(athlete.position?.abbreviation).replace(/e?s$/, ""),
      positionAbbr: athlete.position?.abbreviation ?? "",
      number: athlete.jersey ? Number(athlete.jersey) || undefined : undefined,
      age: typeof athlete.age === "number" ? athlete.age : undefined,
      height: heightLabel(athlete.height),
      weight: weightLabel(athlete.weight),
      country: athlete.citizenship ?? athlete.flag?.alt ?? undefined,
      countryFlag: athlete.flag?.href ?? undefined,
      photo: extra?.photo ?? fdioPhotoUrl(name, athlete.citizenship ?? athlete.flag?.alt ?? undefined),
      goals: extra?.goals ? extra.goals : undefined,
      assists: extra?.assists ? extra.assists : undefined,
      minutes: extra?.minutes ? extra.minutes : undefined,
      appearances: extra?.appearances ? extra.appearances : undefined,
    };
  });
}

export const getSquad = unstable_cache(buildSquad, ["madrid-squad-v2"], {
  revalidate: 3600,
});

// --- Goleadores del Madrid ---
type FootballDataScorer = {
  player?: { name?: string | null };
  team?: { id?: number; name?: string | null };
  goals?: number | null;
  assists?: number | null;
  penalties?: number | null;
};

// Preferido: footballdata.io agrega goles/asistencias de toda la plantilla en la
// temporada. Fallback: top de LaLiga de football-data.org filtrado al Madrid.
async function buildScorers(): Promise<Scorer[]> {
  const fdio = await getFdioByName();
  if (fdio.size > 0) {
    const seen = new Set<string>();
    const scorers: Scorer[] = [];
    for (const agg of fdio.values()) {
      if (seen.has(agg.name) || agg.goals <= 0) continue;
      seen.add(agg.name);
      scorers.push({ name: agg.name, goals: agg.goals, assists: agg.assists, penalties: 0 });
    }
    if (scorers.length > 0) {
      return scorers.sort((a, b) => b.goals - a.goals || b.assists - a.assists);
    }
  }

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

// Goleadores de LaLiga / Champions (football-data.org). El Madrid queda marcado
// para resaltarlo. En pretemporada la competicion actual aun no tiene goles.
const FD_COMPETITION: Record<"laliga" | "champions", string> = {
  laliga: "PD",
  champions: "CL",
};

async function fetchLeagueScorers(comp: "laliga" | "champions"): Promise<Scorer[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) return [];
  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${FD_COMPETITION[comp]}/scorers?limit=20`,
      { headers: { "X-Auth-Token": apiKey }, next: { revalidate: 3600 } },
    );
    if (!response.ok) throw new Error(`football-data ${comp} scorers HTTP ${response.status}`);
    const data = (await response.json()) as { scorers?: FootballDataScorer[] };
    return (data.scorers ?? [])
      .filter((scorer) => scorer.player?.name)
      .map((scorer) => ({
        name: String(scorer.player?.name),
        team: scorer.team?.name ?? undefined,
        isMadrid: scorer.team?.id === 86 || /real madrid/i.test(scorer.team?.name ?? ""),
        goals: Number(scorer.goals) || 0,
        assists: Number(scorer.assists) || 0,
        penalties: Number(scorer.penalties) || 0,
      }))
      .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
  } catch (error) {
    console.warn(`[madrid] ${comp} scorers unavailable:`, error);
    return [];
  }
}

export async function getLeagueScorers(comp: "laliga" | "champions"): Promise<Scorer[]> {
  return unstable_cache(() => fetchLeagueScorers(comp), ["madrid-league-scorers", comp], {
    revalidate: 3600,
  })();
}

// --- Calendario general de ligas (Primera esp.1 + Segunda esp.2, cualquier
// equipo). Ventana ~2 meses via scoreboard de ESPN, keyless. ---
async function fetchLeagueCalendar(league: LeagueId): Promise<LeagueCalendar> {
  const url = `${ESPN_SITE}/${league}/scoreboard?dates=${espnDateRange(60)}&limit=300`;
  try {
    const response = await fetch(url, { next: { revalidate: 1800 } });
    if (!response.ok) throw new Error(`ESPN calendar ${league} HTTP ${response.status}`);
    const data = (await response.json()) as EspnScheduleResponse;
    const matches: LeagueMatch[] = [];
    const teams = new Set<string>();
    for (const event of data.events ?? []) {
      const competition = event.competitions?.[0];
      const home = competition?.competitors?.find((c) => c.homeAway === "home");
      const away = competition?.competitors?.find((c) => c.homeAway === "away");
      if (!home || !away || !event.date) continue;
      const kickoff = new Date(event.date);
      if (Number.isNaN(kickoff.getTime())) continue;
      const { status, detail } = statusOf(event, competition?.status?.type);
      const homeName = home.team?.displayName ?? home.team?.shortDisplayName ?? "?";
      const awayName = away.team?.displayName ?? away.team?.shortDisplayName ?? "?";
      teams.add(homeName);
      teams.add(awayName);
      matches.push({
        id: `${league}-${event.id ?? kickoff.toISOString()}`,
        startsAt: kickoff.toISOString(),
        date: kickoff.toISOString().slice(0, 10),
        home: homeName,
        away: awayName,
        homeLogo: teamLogo(home),
        awayLogo: teamLogo(away),
        status,
        statusDetail: detail,
        homeScore: status === "upcoming" ? undefined : toScore(home.score),
        awayScore: status === "upcoming" ? undefined : toScore(away.score),
        isMadrid: home.team?.id === ESPN_TEAM_ID || away.team?.id === ESPN_TEAM_ID,
      });
    }
    matches.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return { matches, teams: Array.from(teams).sort((a, b) => a.localeCompare(b, "es")) };
  } catch (error) {
    console.warn(`[madrid] league calendar ${league} unavailable:`, error);
    return { matches: [], teams: [] };
  }
}

export async function getLeagueCalendar(league: LeagueId): Promise<LeagueCalendar> {
  return unstable_cache(() => fetchLeagueCalendar(league), ["madrid-league-cal-v1", league], {
    revalidate: 1800,
  })();
}

// --- Detalle en directo / pre-partido del Madrid (ESPN summary, keyless). ---
const COMP_SLUG: Record<CompId, string> = {
  laliga: "esp.1",
  champions: "uefa.champions",
  copa: "esp.copa_del_rey",
  supercopa: "esp.super_cup",
  mundialito: "fifa.cwc",
};

type EspnSummaryAthlete = {
  athlete?: { displayName?: string | null };
  jersey?: string | null;
  starter?: boolean;
  subbedIn?: boolean;
  subbedOut?: boolean;
  position?: { abbreviation?: string | null };
};
type EspnSummaryRoster = {
  homeAway?: "home" | "away";
  team?: { id?: string; displayName?: string | null };
  roster?: EspnSummaryAthlete[];
};
type EspnKeyEvent = {
  type?: { text?: string | null };
  clock?: { displayValue?: string | null };
  team?: { id?: string };
  participants?: Array<{ athlete?: { displayName?: string | null } }>;
};
type EspnSummary = {
  rosters?: EspnSummaryRoster[];
  keyEvents?: EspnKeyEvent[];
  header?: {
    competitions?: Array<{
      status?: { type?: { state?: string; shortDetail?: string | null } };
      competitors?: Array<{ homeAway?: string; score?: string; team?: { id?: string; displayName?: string | null } }>;
    }>;
  };
};

function mapLiveLineup(roster?: EspnSummaryAthlete[]) {
  const starters: LiveLineupPlayer[] = [];
  const bench: LiveLineupPlayer[] = [];
  for (const player of roster ?? []) {
    const mapped: LiveLineupPlayer = {
      name: player.athlete?.displayName ?? "?",
      number: player.jersey ? Number(player.jersey) || undefined : undefined,
      position: player.position?.abbreviation ?? undefined,
      subbedOut: player.subbedOut || undefined,
      subbedIn: player.subbedIn || undefined,
    };
    (player.starter ? starters : bench).push(mapped);
  }
  return { starters, bench };
}

function liveEventType(text: string): LiveEvent["type"] | null {
  if (text.includes("Goal")) return "goal";
  if (text.includes("Yellow")) return "yellow";
  if (text.includes("Red")) return "red";
  if (text.includes("Substitution")) return "sub";
  return null;
}

async function fetchMatchLive(espnId: string, comp: CompId): Promise<MatchLive | null> {
  const slug = COMP_SLUG[comp] ?? "esp.1";
  try {
    const response = await fetch(`${ESPN_SITE}/${slug}/summary?event=${espnId}`, {
      next: { revalidate: 30 },
    });
    if (!response.ok) throw new Error(`ESPN summary HTTP ${response.status}`);
    const data = (await response.json()) as EspnSummary;
    const competition = data.header?.competitions?.[0];
    const homeC = competition?.competitors?.find((c) => c.homeAway === "home");
    const awayC = competition?.competitors?.find((c) => c.homeAway === "away");
    const state = competition?.status?.type?.state;
    const status: MatchStatus = state === "in" ? "live" : state === "post" ? "finished" : "upcoming";

    const homeRoster = data.rosters?.find((r) => r.homeAway === "home");
    const awayRoster = data.rosters?.find((r) => r.homeAway === "away");
    const sideById = new Map<string, "home" | "away">();
    if (homeC?.team?.id) sideById.set(homeC.team.id, "home");
    if (awayC?.team?.id) sideById.set(awayC.team.id, "away");
    if (homeRoster?.team?.id) sideById.set(homeRoster.team.id, "home");
    if (awayRoster?.team?.id) sideById.set(awayRoster.team.id, "away");

    const events: LiveEvent[] = [];
    for (const event of data.keyEvents ?? []) {
      const type = liveEventType(event.type?.text ?? "");
      if (!type) continue;
      const parts = event.participants ?? [];
      events.push({
        minute: event.clock?.displayValue ?? undefined,
        side: sideById.get(event.team?.id ?? "") ?? "home",
        type,
        player: parts[0]?.athlete?.displayName ?? "?",
        assist: type === "goal" ? parts[1]?.athlete?.displayName ?? undefined : undefined,
        playerOut: type === "sub" ? parts[1]?.athlete?.displayName ?? undefined : undefined,
      });
    }

    const home = mapLiveLineup(homeRoster?.roster);
    const away = mapLiveLineup(awayRoster?.roster);

    return {
      status,
      statusDetail: competition?.status?.type?.shortDetail ?? undefined,
      home: homeC?.team?.displayName ?? homeRoster?.team?.displayName ?? "?",
      away: awayC?.team?.displayName ?? awayRoster?.team?.displayName ?? "?",
      homeScore: status !== "upcoming" && homeC?.score != null ? Number(homeC.score) : undefined,
      awayScore: status !== "upcoming" && awayC?.score != null ? Number(awayC.score) : undefined,
      events,
      lineups: { home, away },
      hasLineups: home.starters.length > 0 || away.starters.length > 0,
    };
  } catch (error) {
    console.warn(`[madrid] match live ${espnId} unavailable:`, error);
    return null;
  }
}

export async function getMatchLive(espnId: string, comp: CompId): Promise<MatchLive | null> {
  return unstable_cache(() => fetchMatchLive(espnId, comp), ["madrid-match-live-v1", espnId], {
    revalidate: 30,
  })();
}
