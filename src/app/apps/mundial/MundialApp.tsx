"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/Badge";

const DATA_URL = process.env.NEXT_PUBLIC_WORLD_CUP_DATA_URL ?? "/api/mundial/data";
const OPENFOOTBALL_FALLBACK_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const MADRID_TIME_ZONE = "Europe/Madrid";
const THEME_STORAGE_KEY = "mundial-theme-v2";
const SPAIN_TEAM = "Spain";

type ThemeId = "fifa" | "night" | "northamerica";
type TabId = "calendario" | "faseGrupos" | "clasificacion";
type StageFilter = `group:${string}` | `round:${string}` | "todos";
type MatchStatus = "finished" | "live" | "awaitingResult" | "upcoming";

type Score = {
  ft?: [number, number];
  ht?: [number, number];
  et?: [number, number];
  p?: [number, number];
};

type RawMatch = {
  round: string;
  num?: number;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  ground?: string;
  matchStatus?: string;
  score?: Score;
};

type TournamentData = {
  name: string;
  matches: RawMatch[];
};

type EnrichedMatch = RawMatch & {
  id: string;
  startsAt: Date;
  timestamp: number;
  status: MatchStatus;
};

type Standing = {
  team: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type TeamInfo = {
  name: string;
  countryCode?: string;
};

const themes: Record<ThemeId, Record<string, string>> = {
  fifa: {
    "--wc-page-bg": "#120505",
    "--wc-hero-from": "#2d0808",
    "--wc-hero-to": "#1a0505",
    "--wc-hero-border": "#4a1515",
    "--wc-hero-label": "#c9a227",
    "--wc-hero-soft": "#c4a090",
    "--wc-card-bg": "#1e0a0a",
    "--wc-card-header": "#2d0f0f",
    "--wc-panel-bg": "#2a1010",
    "--wc-accent": "#c9a227",
    "--wc-accent-fg": "#1a0505",
    "--wc-text": "#f0ddd5",
    "--wc-muted": "#9a7070",
    "--wc-border": "#4a1515",
    "--wc-border-inner": "#3a1010",
    "--wc-score-bg": "#3a1515",
    "--wc-score-text": "#c9a227",
    "--wc-row-hl": "#2a1010",
    "--wc-venue-hl": "#2d1515",
    "--wc-venue-hl-text": "#f0ddd5",
  },
  night: {
    "--wc-page-bg": "#0a0e0f",
    "--wc-hero-from": "#0d1a10",
    "--wc-hero-to": "#081208",
    "--wc-hero-border": "#1e3020",
    "--wc-hero-label": "#00e676",
    "--wc-hero-soft": "#9cbfaa",
    "--wc-card-bg": "#111518",
    "--wc-card-header": "#0d1a12",
    "--wc-panel-bg": "#151d17",
    "--wc-accent": "#00c853",
    "--wc-accent-fg": "#050f07",
    "--wc-text": "#e8f5e9",
    "--wc-muted": "#6a8f78",
    "--wc-border": "#1e3020",
    "--wc-border-inner": "#1a2820",
    "--wc-score-bg": "#0d2010",
    "--wc-score-text": "#00e676",
    "--wc-row-hl": "#0d2010",
    "--wc-venue-hl": "#0d1a10",
    "--wc-venue-hl-text": "#e8f5e9",
  },
  northamerica: {
    "--wc-page-bg": "#f0f4f8",
    "--wc-hero-from": "#0d1b2a",
    "--wc-hero-to": "#1e3a5f",
    "--wc-hero-border": "#d8e5f0",
    "--wc-hero-label": "#f87171",
    "--wc-hero-soft": "#c8d6e5",
    "--wc-card-bg": "#ffffff",
    "--wc-card-header": "#0d1b2a",
    "--wc-panel-bg": "#eef3f7",
    "--wc-accent": "#dc2626",
    "--wc-accent-fg": "#ffffff",
    "--wc-text": "#0f172a",
    "--wc-muted": "#64748b",
    "--wc-border": "#dde3ea",
    "--wc-border-inner": "#edf1f5",
    "--wc-score-bg": "#f0f4f8",
    "--wc-score-text": "#0d1b2a",
    "--wc-row-hl": "#f0faf5",
    "--wc-venue-hl": "#eff6ff",
    "--wc-venue-hl-text": "#0d1b2a",
  },
};

const themeConfigs: Record<ThemeId, { label: string; swatch: string; activeClass: string }> = {
  fifa:         { label: "FIFA 2026",    swatch: "#c9a227", activeClass: "bg-[#c9a227] text-[#1a0505]" },
  night:        { label: "Noche",        swatch: "#00c853", activeClass: "bg-[#00c853] text-[#050f07]" },
  northamerica: { label: "Norteamérica", swatch: "#dc2626", activeClass: "bg-[#dc2626] text-white" },
};

const tabs: { id: TabId; label: string }[] = [
  { id: "calendario", label: "Calendario" },
  { id: "faseGrupos", label: "Grupos" },
  { id: "clasificacion", label: "Clasificación" },
];

const roundLabels: Record<string, string> = {
  "Round of 32": "Dieciseisavos",
  "Round of 16": "Octavos",
  "Quarter-finals": "Cuartos",
  "Quarter-finals 1": "Cuartos",
  "Semi-finals": "Semis",
  "Semi-finals 1": "Semis",
  "Third-place match": "3er puesto",
  "Third-place play-off": "3er puesto",
  Final: "Final",
};

const teamInfo: Record<string, TeamInfo> = {
  Mexico: { name: "México", countryCode: "mx" },
  "South Africa": { name: "Sudáfrica", countryCode: "za" },
  "South Korea": { name: "Corea Sur", countryCode: "kr" },
  "Czech Republic": { name: "Rep. Checa", countryCode: "cz" },
  Canada: { name: "Canadá", countryCode: "ca" },
  "Bosnia & Herzegovina": { name: "Bosnia y Herz.", countryCode: "ba" },
  Qatar: { name: "Catar", countryCode: "qa" },
  Switzerland: { name: "Suiza", countryCode: "ch" },
  Brazil: { name: "Brasil", countryCode: "br" },
  Morocco: { name: "Marruecos", countryCode: "ma" },
  Haiti: { name: "Haití", countryCode: "ht" },
  Scotland: { name: "Escocia", countryCode: "gb-sct" },
  USA: { name: "EE. UU.", countryCode: "us" },
  Paraguay: { name: "Paraguay", countryCode: "py" },
  Australia: { name: "Australia", countryCode: "au" },
  Turkey: { name: "Turquía", countryCode: "tr" },
  Germany: { name: "Alemania", countryCode: "de" },
  "Curaçao": { name: "Curazao", countryCode: "cw" },
  "Ivory Coast": { name: "C. de Marfil", countryCode: "ci" },
  Ecuador: { name: "Ecuador", countryCode: "ec" },
  Netherlands: { name: "P. Bajos", countryCode: "nl" },
  Japan: { name: "Japón", countryCode: "jp" },
  Sweden: { name: "Suecia", countryCode: "se" },
  Tunisia: { name: "Túnez", countryCode: "tn" },
  Belgium: { name: "Bélgica", countryCode: "be" },
  Egypt: { name: "Egipto", countryCode: "eg" },
  Iran: { name: "Irán", countryCode: "ir" },
  "New Zealand": { name: "N. Zelanda", countryCode: "nz" },
  Spain: { name: "España", countryCode: "es" },
  "Cape Verde": { name: "Cabo Verde", countryCode: "cv" },
  "Saudi Arabia": { name: "Arabia Saudí", countryCode: "sa" },
  Uruguay: { name: "Uruguay", countryCode: "uy" },
  France: { name: "Francia", countryCode: "fr" },
  Senegal: { name: "Senegal", countryCode: "sn" },
  Iraq: { name: "Irak", countryCode: "iq" },
  Norway: { name: "Noruega", countryCode: "no" },
  Argentina: { name: "Argentina", countryCode: "ar" },
  Algeria: { name: "Argelia", countryCode: "dz" },
  Austria: { name: "Austria", countryCode: "at" },
  Jordan: { name: "Jordania", countryCode: "jo" },
  Portugal: { name: "Portugal", countryCode: "pt" },
  "DR Congo": { name: "R. D. Congo", countryCode: "cd" },
  Uzbekistan: { name: "Uzbekistán", countryCode: "uz" },
  Colombia: { name: "Colombia", countryCode: "co" },
  England: { name: "Inglaterra", countryCode: "gb-eng" },
  Croatia: { name: "Croacia", countryCode: "hr" },
  Ghana: { name: "Ghana", countryCode: "gh" },
  Panama: { name: "Panamá", countryCode: "pa" },
};

function getTeamInfo(team: string): TeamInfo {
  return teamInfo[team] ?? { name: team };
}

function displayTeamName(team: string) {
  return getTeamInfo(team).name;
}

function parseKickoff(date: string, time?: string) {
  const [year, month, day] = date.split("-").map(Number);
  const match = time?.match(
    /^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2})(?::?(\d{2}))?)?$/,
  );

  if (!match) {
    return new Date(Date.UTC(year, month - 1, day, 12, 0));
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const offsetHours = match[3] ? Number(match[3]) : 0;
  const offsetMinutes = match[4] ? Number(match[4]) : 0;
  const offsetSign = match[3]?.startsWith("-") ? -1 : 1;
  const offset = offsetHours * 60 + offsetSign * offsetMinutes;

  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes) - offset * 60_000,
  );
}

function formatMadridDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: MADRID_TIME_ZONE,
  }).format(date);
}

function formatMadridTime(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MADRID_TIME_ZONE,
    timeZoneName: "short",
  }).format(date);
}

function formatLongMadridDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: MADRID_TIME_ZONE,
  }).format(date);
}

function getStatus(match: RawMatch, startsAt: Date): MatchStatus {
  if (
    match.matchStatus &&
    ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(match.matchStatus)
  ) {
    return "live";
  }

  if (match.matchStatus && ["FINISHED", "AWARDED"].includes(match.matchStatus)) {
    return "finished";
  }

  if (match.score?.ft) return "finished";
  return startsAt.getTime() < Date.now() ? "awaitingResult" : "upcoming";
}

function scoreLabel(score?: Score) {
  if (!score?.ft) return null;
  const suffix = score.p
    ? ` pen. ${score.p[0]}-${score.p[1]}`
    : score.et
      ? " prórroga"
      : "";
  return `${score.ft[0]} - ${score.ft[1]}${suffix}`;
}

function matchScoreLabel(match: EnrichedMatch) {
  const score = scoreLabel(match.score);
  if (score) {
    return score;
  }

  if (match.status === "live") {
    return "0 - 0";
  }

  return "- vs -";
}

function groupShortName(group?: string) {
  return group?.replace("Group", "Grupo") ?? "Eliminatorias";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function enrichMatches(matches: RawMatch[]): EnrichedMatch[] {
  return matches
    .map((match, index) => {
      const startsAt = parseKickoff(match.date, match.time);
      return {
        ...match,
        id: `${match.date}-${match.round}-${match.team1}-${match.team2}-${index}`,
        startsAt,
        timestamp: startsAt.getTime(),
        status: getStatus(match, startsAt),
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

function createStanding(team: string): Standing {
  return {
    team,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function buildStandings(matches: EnrichedMatch[]) {
  const groups = new Map<string, Map<string, Standing>>();

  for (const match of matches) {
    if (!match.group) continue;
    if (!groups.has(match.group)) groups.set(match.group, new Map());

    const group = groups.get(match.group)!;
    group.set(match.team1, group.get(match.team1) ?? createStanding(match.team1));
    group.set(match.team2, group.get(match.team2) ?? createStanding(match.team2));

    if (!match.score?.ft) continue;

    const [homeGoals, awayGoals] = match.score.ft;
    const home = group.get(match.team1)!;
    const away = group.get(match.team2)!;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;

    if (homeGoals > awayGoals) {
      home.wins += 1;
      away.losses += 1;
      home.points += 3;
    } else if (awayGoals > homeGoals) {
      away.wins += 1;
      home.losses += 1;
      away.points += 3;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return Array.from(groups.entries())
    .map(([group, standings]) => ({
      group,
      teams: Array.from(standings.values())
        .map((team) => ({ ...team, goalDifference: team.goalsFor - team.goalsAgainst }))
        .sort(
          (a, b) =>
            b.points - a.points ||
            b.goalDifference - a.goalDifference ||
            b.goalsFor - a.goalsFor ||
            a.team.localeCompare(b.team),
        ),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}


function buildGroupCards(matches: EnrichedMatch[]) {
  const groups = new Map<
    string,
    { group: string; teams: Set<string>; matches: EnrichedMatch[] }
  >();

  for (const match of matches) {
    if (!match.group) continue;
    const group = groups.get(match.group) ?? {
      group: match.group,
      teams: new Set<string>(),
      matches: [],
    };
    group.teams.add(match.team1);
    group.teams.add(match.team2);
    group.matches.push(match);
    groups.set(match.group, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      group: group.group,
      teams: Array.from(group.teams).sort((a, b) =>
        displayTeamName(a).localeCompare(displayTeamName(b), "es"),
      ),
      matches: group.matches.sort((a, b) => a.timestamp - b.timestamp),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

function buildKnockoutRounds(matches: EnrichedMatch[]) {
  const roundMap = new Map<string, EnrichedMatch[]>();

  for (const match of matches) {
    if (match.group) continue;
    const existing = roundMap.get(match.round) ?? [];
    existing.push(match);
    roundMap.set(match.round, existing);
  }

  return Array.from(roundMap.entries())
    .map(([round, roundMatches]) => ({
      round,
      matches: roundMatches.sort((a, b) => a.timestamp - b.timestamp),
      firstTs: roundMatches.reduce((min, m) => Math.min(min, m.timestamp), Infinity),
    }))
    .sort((a, b) => a.firstTs - b.firstTs);
}

function groupMatchesByDay(
  matches: EnrichedMatch[],
): { date: string; matches: EnrichedMatch[] }[] {
  const groups = new Map<string, EnrichedMatch[]>();
  for (const match of matches) {
    const existing = groups.get(match.date) ?? [];
    existing.push(match);
    groups.set(match.date, existing);
  }
  return Array.from(groups.entries())
    .map(([date, dayMatches]) => ({ date, matches: dayMatches }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function isGroupMatch(match: EnrichedMatch) {
  return Boolean(match.group);
}

function isTeamMatch(match: EnrichedMatch, team: string) {
  return match.team1 === team || match.team2 === team;
}

export function MundialApp() {
  const [activeTab, setActiveTab] = useState<TabId>("calendario");
  const [activeTheme, setActiveTheme] = useState<ThemeId>("night");
  const [data, setData] = useState<TournamentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("todos");
  const [stageFilter, setStageFilter] = useState<StageFilter>("todos");
  const [spainOnly, setSpainOnly] = useState(false);
  const hasAutoScrolled = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (!saved || !(saved in themes)) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => setActiveTheme(saved));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) {
      document.body.dataset.mundialStandalone = "true";
    }

    return () => {
      delete document.body.dataset.mundialStandalone;
    };
  }, []);

  function handleThemeChange(theme: ThemeId) {
    setActiveTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  useEffect(() => {
    let mounted = true;
    let controller = new AbortController();
    let timeoutId: number | undefined;

    async function loadData() {
      setIsLoading(true);
      try {
        let response = await fetch(DATA_URL, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok && DATA_URL !== OPENFOOTBALL_FALLBACK_URL) {
          response = await fetch(OPENFOOTBALL_FALLBACK_URL, {
            cache: "no-store",
            signal: controller.signal,
          });
        }

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextData = (await response.json()) as TournamentData;
        if (mounted) {
          setData(nextData);
          setUpdatedAt(new Date());
          setError(null);
          setIsLoading(false);
          // Polling adaptativo — seguro en el tier gratuito: el CDN de Vercel absorbe
          // las peticiones de los clientes (Cache-Control: max-age=30), así que
          // football-data.org recibe como máximo ~2 req/min, muy por debajo del límite de 10.
          const today = new Date().toISOString().slice(0, 10);
          const hasLive = nextData.matches.some((m) =>
            ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.matchStatus ?? ""),
          );
          const hasMatchToday = nextData.matches.some((m) => m.date === today);
          // Live: 60 s · Partido hoy: 3 min · Sin partido: 15 min
          const delay = hasLive ? 60_000 : hasMatchToday ? 3 * 60_000 : 15 * 60_000;
          timeoutId = window.setTimeout(() => {
            controller.abort();
            controller = new AbortController();
            loadData();
          }, delay);
        }
      } catch (nextError) {
        if (mounted && !(nextError instanceof DOMException)) {
          setError("No se han podido cargar los datos del calendario.");
          setIsLoading(false);
          // Reintento tras error: 2 min
          timeoutId = window.setTimeout(() => {
            controller.abort();
            controller = new AbortController();
            loadData();
          }, 2 * 60_000);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
      controller.abort();
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [refreshTick]);

  function handleRefresh() {
    setRefreshTick((t) => t + 1);
  }

  // Auto-scroll al día de hoy la primera vez que se carga el calendario
  useEffect(() => {
    if (activeTab !== "calendario" || hasAutoScrolled.current || !data) return;
    const today = new Date().toISOString().slice(0, 10);
    const el = document.getElementById(`dia-${today}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      hasAutoScrolled.current = true;
    }
  }, [activeTab, data]);

  const matches = useMemo(() => enrichMatches(data?.matches ?? []), [data]);
  const groups = useMemo(() => buildStandings(matches), [matches]);
  const groupCards = useMemo(() => buildGroupCards(matches), [matches]);
  const knockoutRounds = useMemo(() => buildKnockoutRounds(matches), [matches]);
  const stageFilterOptions = useMemo(
    () => [
      { key: "todos" as StageFilter, label: "Todo" },
      ...groupCards.map((group) => ({
        key: `group:${group.group}` as StageFilter,
        label: groupShortName(group.group),
      })),
      ...knockoutRounds.map((round) => ({
        key: `round:${round.round}` as StageFilter,
        label: roundLabels[round.round] ?? round.round,
      })),
    ],
    [groupCards, knockoutRounds],
  );
  const groupOptions = useMemo(
    () => Array.from(new Set(matches.filter(isGroupMatch).map((match) => match.group!))),
    [matches],
  );

  const liveMatch = matches.find((match) => match.status === "live");
  const nextMatch = matches.find((match) => match.status !== "finished");
  const heroMatch = liveMatch ?? nextMatch;
  const isHeroLive = heroMatch?.status === "live";

  const normalizedQuery = normalizeText(query.trim());
  const filteredMatches = matches.filter((match) => {
    const matchesQuery =
      !normalizedQuery ||
      normalizeText(
        `${match.team1} ${match.team2} ${displayTeamName(match.team1)} ${displayTeamName(
          match.team2,
        )} ${match.ground ?? ""} ${match.group ?? ""} ${match.round}`,
      ).includes(normalizedQuery);
    const matchesGroup =
      groupFilter === "todos" ||
      match.group === groupFilter ||
      (groupFilter === "eliminatorias" && !match.group);
    const matchesSpain = !spainOnly || isTeamMatch(match, SPAIN_TEAM);
    return matchesQuery && matchesGroup && matchesSpain;
  });

  const todayDate = new Date().toISOString().slice(0, 10);
  const hasTodayMatches = filteredMatches.some((m) => m.date === todayDate);

  const visibleGroupCards =
    (stageFilter === "todos"
      ? groupCards
      : stageFilter.startsWith("group:")
        ? groupCards.filter((group) => group.group === stageFilter.slice("group:".length))
        : [])
      .map((group) => ({
        ...group,
        matches: spainOnly
          ? group.matches.filter((match) => isTeamMatch(match, SPAIN_TEAM))
          : group.matches,
      }))
      .filter((group) => !spainOnly || group.matches.length > 0);
  const visibleKnockoutRounds =
    (stageFilter === "todos"
      ? knockoutRounds
      : stageFilter.startsWith("round:")
        ? knockoutRounds.filter((round) => round.round === stageFilter.slice("round:".length))
        : [])
      .map((round) => ({
        ...round,
        matches: spainOnly
          ? round.matches.filter((match) => isTeamMatch(match, SPAIN_TEAM))
          : round.matches,
      }))
      .filter((round) => !spainOnly || round.matches.length > 0);

  return (
    <div
      className="mundial-app-shell min-h-screen bg-[var(--wc-page-bg)] text-[var(--wc-text)]"
      style={themes[activeTheme] as React.CSSProperties}
    >
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--wc-hero-border)] bg-gradient-to-br from-[var(--wc-hero-from)] to-[var(--wc-hero-to)] text-white">
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <span className="absolute -right-10 -top-10 text-[22rem] leading-none opacity-[0.04]">
            ⚽
          </span>
        </div>
        <div className="container-shell relative py-5 lg:py-10">
          <div className="mb-3 flex justify-end lg:mb-6">
            <ThemeSelector activeTheme={activeTheme} onThemeChange={handleThemeChange} />
          </div>
          <div className="grid gap-4 lg:gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[var(--wc-hero-label)]">
                <span>🏆</span>
                <span>FIFA World Cup 2026</span>
              </p>
              <h1 className="mt-2 whitespace-nowrap text-4xl font-black leading-[1.05] sm:mt-4 sm:text-5xl lg:text-6xl">
                MUNDIAL 2026
              </h1>
              <p className="mt-2 hidden max-w-2xl text-base leading-7 text-[var(--wc-hero-soft)] sm:mt-4 sm:block">
                Calendario, horarios en España, resultados y clasificaciones.
              </p>
              <p className="mt-3 hidden flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[var(--wc-hero-soft)] sm:flex">
                <span className="font-semibold">Sedes:</span>
                <span className="flex items-center gap-1.5">
                  <FlagImg code="us" name="Estados Unidos" />
                  <span>Estados Unidos</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FlagImg code="mx" name="México" />
                  <span>México</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <FlagImg code="ca" name="Canadá" />
                  <span>Canadá</span>
                </span>
              </p>
            </div>

            <aside className="rounded-xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/20">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--wc-hero-label)]">
                {isHeroLive ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    En directo
                  </>
                ) : "Próximo partido"}
              </p>
              {heroMatch ? (
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2 text-lg font-bold">
                    <TeamLabel team={heroMatch.team1} />
                    {isHeroLive ? (
                      <span className="shrink-0 rounded bg-[var(--wc-score-bg)] px-2.5 py-1 text-sm font-black text-[var(--wc-score-text)]">
                        {matchScoreLabel(heroMatch)}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-[var(--wc-hero-label)]">vs</span>
                    )}
                    <TeamLabel team={heroMatch.team2} />
                  </div>
                  <p className="mt-3 text-sm text-[var(--wc-hero-soft)]">
                    {formatLongMadridDate(heroMatch.startsAt)} ·{" "}
                    {formatMadridTime(heroMatch.startsAt)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--wc-hero-soft)]">
                    {groupShortName(heroMatch.group)} · {heroMatch.ground}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--wc-hero-soft)]">
                  No hay partidos pendientes en la fuente actual.
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container-shell pt-4 pb-8 sm:py-8">
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-3 rounded-md bg-[var(--wc-panel-bg)] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`focus-ring min-h-10 rounded-md px-2 text-center text-sm font-bold transition ${
                  activeTab === tab.id
                    ? "bg-[var(--wc-accent)] text-[var(--wc-accent-fg)] shadow-sm"
                    : "text-[var(--wc-muted)] hover:bg-[var(--wc-card-bg)] hover:text-[var(--wc-text)]"
                }`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--wc-muted)]">
            <button
              type="button"
              title="Pulsa para actualizar"
              disabled={isLoading}
              onClick={handleRefresh}
              className="inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[rgba(24,24,27,0.12)] bg-[var(--wc-panel-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--wc-text)] transition hover:border-[var(--wc-accent)] hover:text-[var(--wc-accent)] disabled:cursor-wait disabled:opacity-60"
            >
              <span className={isLoading ? "animate-spin inline-block" : ""}>↻</span>
              {isLoading ? "Actualizando…" : error ? "Error — reintentar" : "Actualizar datos"}
            </button>
            {updatedAt ? (
              <span>Actualizado {formatMadridTime(updatedAt)}</span>
            ) : (
              <span>Cargando…</span>
            )}
          </div>
        </div>

        {activeTab === "calendario" ? (
          <section className="mt-6">
            <div className="flex gap-2 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] p-3 shadow-sm">
              <SpainFilterButton
                active={spainOnly}
                compact
                onClick={() => setSpainOnly((value) => !value)}
              />
              {hasTodayMatches ? (
                <button
                  type="button"
                  onClick={() => {
                    document
                      .getElementById(`dia-${new Date().toISOString().slice(0, 10)}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="focus-ring inline-flex min-h-9 shrink-0 items-center rounded-md bg-[var(--wc-panel-bg)] px-3 text-sm font-bold text-[var(--wc-muted)] transition hover:text-[var(--wc-text)]"
                >
                  Hoy
                </button>
              ) : null}
              <input
                aria-label="Buscar equipo, ciudad o grupo"
                className="min-h-9 min-w-0 flex-[1_1_150px] rounded-md border border-[var(--wc-border)] bg-[var(--wc-panel-bg)] px-3 text-sm text-[var(--wc-text)] outline-none transition focus:border-[var(--wc-accent)] focus:ring-2 focus:ring-[var(--wc-accent)]"
                placeholder="Buscar..."
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                aria-label="Filtrar por grupo"
                className="min-h-9 rounded-md border border-[var(--wc-border)] bg-[var(--wc-panel-bg)] px-2 text-sm text-[var(--wc-text)] outline-none transition focus:border-[var(--wc-accent)]"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option value="todos">Grupo</option>
                {groupOptions.map((group) => (
                  <option key={group} value={group}>
                    {groupShortName(group)}
                  </option>
                ))}
                <option value="eliminatorias">Eliminatorias</option>
              </select>
            </div>

            <div className="mt-4 space-y-6">
              {groupMatchesByDay(filteredMatches).map(({ date, matches: dayMatches }) => (
                <div key={date} id={`dia-${date}`}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--wc-muted)]">
                      {formatLongMadridDate(dayMatches[0].startsAt)}
                    </h3>
                    <span className="h-px flex-1 bg-[var(--wc-border)]" />
                    <span className="text-[10px] text-[var(--wc-muted)]">
                      {dayMatches.length === 1 ? "1 partido" : `${dayMatches.length} partidos`}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {dayMatches.map((match) => (
                      <MatchRow key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "faseGrupos" ? (
          <>
            <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] p-2 shadow-sm">
              <div className="flex min-w-max gap-2">
                <SpainFilterButton active={spainOnly} onClick={() => setSpainOnly((value) => !value)} />
                {stageFilterOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setStageFilter(option.key)}
                    className={`focus-ring min-h-9 rounded-md px-3 text-sm font-bold transition ${
                      stageFilter === option.key
                        ? "bg-[var(--wc-accent)] text-[var(--wc-accent-fg)]"
                        : "bg-[var(--wc-panel-bg)] text-[var(--wc-muted)] hover:text-[var(--wc-text)]"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {visibleGroupCards.length > 0 ? (
              <section className="mt-5 grid gap-5 xl:grid-cols-2">
                {visibleGroupCards.map((group) => (
                  <GroupFixtureCard
                    key={group.group}
                    group={group.group}
                    teams={group.teams}
                    matches={group.matches}
                  />
                ))}
              </section>
            ) : null}

            {visibleKnockoutRounds.length > 0 ? (
              <section className="mt-10">
                <div className="mb-5 flex items-center gap-3 border-b border-[var(--wc-border)] pb-4">
                  <span className="text-2xl">🏆</span>
                  <h2 className="text-2xl font-black text-[var(--wc-text)]">
                    Fase Eliminatoria
                  </h2>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {visibleKnockoutRounds.map((r) => (
                    <KnockoutRoundCard key={r.round} round={r.round} matches={r.matches} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}

        {activeTab === "clasificacion" ? (
          <section className="mt-6 grid gap-5 xl:grid-cols-2">
            {groups.map((group) => (
              <GroupTable key={group.group} group={group.group} teams={group.teams} />
            ))}
          </section>
        ) : null}


        <p className="mt-8 text-xs leading-5 text-[var(--wc-muted)]">
          Datos: football-data.org · openfootball/worldcup.json
        </p>
      </div>
    </div>
  );
}

function FlagImg({ code, name }: { code: string; name: string }) {
  return (
    <img
      src={`https://flagcdn.com/20x15/${code}.png`}
      srcSet={`https://flagcdn.com/40x30/${code}.png 2x`}
      width={20}
      height={15}
      alt={`Bandera de ${name}`}
      className="shrink-0 rounded-[1px] object-cover"
    />
  );
}

function ThemeSelector({
  activeTheme,
  onThemeChange,
}: {
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/20 p-1">
      {(Object.keys(themeConfigs) as ThemeId[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => onThemeChange(id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
            activeTheme === id
              ? themeConfigs[id].activeClass
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full border border-white/30"
            style={{ background: themeConfigs[id].swatch }}
          />
          {themeConfigs[id].label}
        </button>
      ))}
    </div>
  );
}

function SpainFilterButton({
  active,
  compact = false,
  onClick,
}: {
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={active ? "Mostrar todos los partidos" : "Ver partidos de España"}
      aria-pressed={active}
      onClick={onClick}
      className={`focus-ring inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md text-sm font-bold transition ${
        active
          ? "bg-[var(--wc-accent)] text-[var(--wc-accent-fg)]"
          : "bg-[var(--wc-panel-bg)] text-[var(--wc-muted)] hover:text-[var(--wc-text)]"
      } ${compact ? "w-10 px-2" : "px-3"}`}
    >
      <FlagImg code="es" name="España" />
      {compact ? <span className="sr-only">España</span> : <span>España</span>}
    </button>
  );
}


function TeamLabel({
  team,
  compact = false,
  align = "left",
}: {
  team: string;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const info = getTeamInfo(team);

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap ${
        align === "right" ? "justify-end" : ""
      }`}
    >
      {info.countryCode ? (
        <img
          src={`https://flagcdn.com/20x15/${info.countryCode}.png`}
          srcSet={`https://flagcdn.com/40x30/${info.countryCode}.png 2x`}
          width={compact ? 16 : 20}
          height={compact ? 12 : 15}
          alt={`Bandera de ${info.name}`}
          className="shrink-0 rounded-[1px] object-cover"
        />
      ) : null}
      <span className="min-w-0 truncate">{info.name}</span>
    </span>
  );
}

const GROUP_COLORS: Record<string, { bg: string; color: string }> = {
  A: { bg: "#ff6b6b", color: "#5c0000" },
  B: { bg: "#ff9f43", color: "#5c2600" },
  C: { bg: "#ffd43b", color: "#4a3000" },
  D: { bg: "#a9e34b", color: "#2a4400" },
  E: { bg: "#51cf66", color: "#0a4020" },
  F: { bg: "#20c997", color: "#044035" },
  G: { bg: "#22d3ee", color: "#0c3e54" },
  H: { bg: "#4dabf7", color: "#0c2860" },
  I: { bg: "#748ffc", color: "#16066e" },
  J: { bg: "#da77f2", color: "#46066e" },
  K: { bg: "#f783ac", color: "#5c0030" },
  L: { bg: "#f9a825", color: "#4a2800" },
};

function GroupBadge({ group }: { group?: string }) {
  const label = groupShortName(group);
  const letter = group?.split(" ").pop() ?? "";
  const colors = GROUP_COLORS[letter];
  return (
    <span
      className="inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-bold"
      style={
        colors
          ? { background: colors.bg, color: colors.color, borderColor: "transparent" }
          : { background: "var(--wc-panel-bg)", color: "var(--wc-muted)", borderColor: "transparent" }
      }
    >
      {label}
    </span>
  );
}

function LiveBadge() {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-500">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]" />
      Live
    </span>
  );
}

function MatchRow({ match }: { match: EnrichedMatch }) {
  const score = matchScoreLabel(match);

  return (
    <article className="rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] p-3 shadow-sm transition hover:border-[var(--wc-accent)]">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-x-2">
          <span className="font-bold capitalize text-[var(--wc-text)]">
            {formatMadridDate(match.startsAt)}
          </span>
          <span className="text-[var(--wc-muted)]">·</span>
          <span className="text-[var(--wc-muted)]">{formatMadridTime(match.startsAt)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {match.status === "live" ? <LiveBadge /> : null}
          <GroupBadge group={match.group} />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <div className="min-w-0 text-right text-[13px] font-bold text-[var(--wc-text)] sm:text-sm">
          <TeamLabel team={match.team1} align="right" />
        </div>
        <div className="shrink-0 rounded bg-[var(--wc-score-bg)] px-2 py-1 text-xs font-black text-[var(--wc-score-text)] sm:px-2.5">
          {score}
        </div>
        <div className="min-w-0 text-[13px] font-bold text-[var(--wc-text)] sm:text-sm">
          <TeamLabel team={match.team2} />
        </div>
      </div>
      {match.ground ? (
        <p className="mt-1.5 text-center text-xs text-[var(--wc-muted)]">{match.ground}</p>
      ) : null}
    </article>
  );
}

function GroupFixtureCard({
  group,
  teams,
  matches,
}: {
  group: string;
  teams: string[];
  matches: EnrichedMatch[];
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] shadow-sm">
      <div className="border-b border-[var(--wc-border)] bg-[var(--wc-card-header)] px-4 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{groupShortName(group)}</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {teams.map((team) => (
            <div
              key={team}
              className="min-w-0 rounded-md border border-white/15 bg-white/[0.08] px-2.5 py-2 text-xs font-semibold sm:px-3 sm:text-sm"
            >
              <TeamLabel team={team} compact />
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[var(--wc-border-inner)]">
        {matches.map((match) => (
          <MiniMatchRow key={match.id} match={match} />
        ))}
      </div>
    </article>
  );
}

function KnockoutRoundCard({
  round,
  matches,
}: {
  round: string;
  matches: EnrichedMatch[];
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] shadow-sm">
      <div className="border-b border-[var(--wc-border)] bg-[var(--wc-card-header)] px-4 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">{roundLabels[round] ?? round}</h3>
          <Badge>{`${matches.length} ${matches.length === 1 ? "partido" : "partidos"}`}</Badge>
        </div>
      </div>
      <div className="divide-y divide-[var(--wc-border-inner)]">
        {matches.map((match) => (
          <MiniMatchRow key={match.id} match={match} />
        ))}
      </div>
    </article>
  );
}

function MiniMatchRow({ match }: { match: EnrichedMatch }) {
  const score = matchScoreLabel(match);

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--wc-muted)]">
        <span className="font-semibold capitalize text-[var(--wc-text)]">
          {formatMadridDate(match.startsAt)}
        </span>
        <span>·</span>
        <span>{formatMadridTime(match.startsAt)}</span>
        {match.ground ? (
          <>
            <span>·</span>
            <span>{match.ground}</span>
          </>
        ) : null}
        {match.status === "live" ? <LiveBadge /> : null}
      </div>
      <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <div className="min-w-0 text-right text-[11px] font-bold text-[var(--wc-text)] sm:text-xs">
          <TeamLabel team={match.team1} compact align="right" />
        </div>
        <div className="shrink-0 rounded bg-[var(--wc-score-bg)] px-1.5 py-1 text-[11px] font-black text-[var(--wc-score-text)] sm:px-2 sm:text-xs">
          {score}
        </div>
        <div className="min-w-0 text-[11px] font-bold text-[var(--wc-text)] sm:text-xs">
          <TeamLabel team={match.team2} compact />
        </div>
      </div>
    </div>
  );
}

function GroupTable({ group, teams }: { group: string; teams: Standing[] }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--wc-border)] bg-[var(--wc-card-header)] px-4 py-3 text-white">
        <h2 className="text-lg font-bold">{groupShortName(group)}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-[var(--wc-panel-bg)] text-left text-[10px] uppercase tracking-[0.08em] text-[var(--wc-muted)] sm:text-xs sm:tracking-[0.1em]">
            <tr>
              <th className="px-2 py-2 sm:px-4 sm:py-3">Equipo</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">PJ</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">G</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">E</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">P</th>
              <th className="hidden px-3 py-3 text-center sm:table-cell">GF</th>
              <th className="hidden px-3 py-3 text-center sm:table-cell">GC</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">DG</th>
              <th className="px-2 py-2 text-center sm:px-4 sm:py-3">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--wc-border-inner)]">
            {teams.map((team, index) => (
              <tr key={team.team} className={index < 2 ? "bg-[var(--wc-row-hl)]" : undefined}>
                <td className="min-w-0 px-2 py-2 font-bold text-[var(--wc-text)] sm:px-4 sm:py-3">
                  <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--wc-panel-bg)] text-[10px] text-[var(--wc-muted)] sm:mr-2 sm:h-6 sm:w-6 sm:text-xs">
                    {index + 1}
                  </span>
                  <TeamLabel team={team.team} compact />
                </td>
                <Cell>{team.played}</Cell>
                <Cell>{team.wins}</Cell>
                <Cell>{team.draws}</Cell>
                <Cell>{team.losses}</Cell>
                <HiddenCell>{team.goalsFor}</HiddenCell>
                <HiddenCell>{team.goalsAgainst}</HiddenCell>
                <Cell>{team.goalDifference}</Cell>
                <td className="px-2 py-2 text-center text-sm font-black text-[var(--wc-accent)] sm:px-4 sm:py-3 sm:text-base">
                  {team.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-1.5 py-2 text-center text-[var(--wc-muted)] sm:px-3 sm:py-3">{children}</td>;
}

function HiddenCell({ children }: { children: React.ReactNode }) {
  return <td className="hidden px-3 py-3 text-center text-[var(--wc-muted)] sm:table-cell">{children}</td>;
}
