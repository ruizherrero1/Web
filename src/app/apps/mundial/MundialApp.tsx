"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/Badge";

const DATA_URL =
  process.env.NEXT_PUBLIC_WORLD_CUP_DATA_URL ??
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const MADRID_TIME_ZONE = "Europe/Madrid";

type TabId = "calendario" | "faseGrupos" | "clasificacion" | "sedes";
type MatchStatus = "finished" | "awaitingResult" | "upcoming";

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
  flag?: string;
};

const tabs: { id: TabId; label: string }[] = [
  { id: "calendario", label: "Calendario" },
  { id: "faseGrupos", label: "Grupos y partidos" },
  { id: "clasificacion", label: "Clasificación" },
  { id: "sedes", label: "Sedes" },
];

const teamInfo: Record<string, TeamInfo> = {
  Mexico: { name: "México", flag: "🇲🇽" },
  "South Africa": { name: "Sudáfrica", flag: "🇿🇦" },
  "South Korea": { name: "Corea del Sur", flag: "🇰🇷" },
  "Czech Republic": { name: "República Checa", flag: "🇨🇿" },
  Canada: { name: "Canadá", flag: "🇨🇦" },
  "Bosnia & Herzegovina": { name: "Bosnia y Herzegovina", flag: "🇧🇦" },
  Qatar: { name: "Catar", flag: "🇶🇦" },
  Switzerland: { name: "Suiza", flag: "🇨🇭" },
  Brazil: { name: "Brasil", flag: "🇧🇷" },
  Morocco: { name: "Marruecos", flag: "🇲🇦" },
  Haiti: { name: "Haití", flag: "🇭🇹" },
  Scotland: {
    name: "Escocia",
    flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  },
  USA: { name: "Estados Unidos", flag: "🇺🇸" },
  Paraguay: { name: "Paraguay", flag: "🇵🇾" },
  Australia: { name: "Australia", flag: "🇦🇺" },
  Turkey: { name: "Turquía", flag: "🇹🇷" },
  Germany: { name: "Alemania", flag: "🇩🇪" },
  Curaçao: { name: "Curazao", flag: "🇨🇼" },
  "Ivory Coast": { name: "Costa de Marfil", flag: "🇨🇮" },
  Ecuador: { name: "Ecuador", flag: "🇪🇨" },
  Netherlands: { name: "Países Bajos", flag: "🇳🇱" },
  Japan: { name: "Japón", flag: "🇯🇵" },
  Sweden: { name: "Suecia", flag: "🇸🇪" },
  Tunisia: { name: "Túnez", flag: "🇹🇳" },
  Belgium: { name: "Bélgica", flag: "🇧🇪" },
  Egypt: { name: "Egipto", flag: "🇪🇬" },
  Iran: { name: "Irán", flag: "🇮🇷" },
  "New Zealand": { name: "Nueva Zelanda", flag: "🇳🇿" },
  Spain: { name: "España", flag: "🇪🇸" },
  "Cape Verde": { name: "Cabo Verde", flag: "🇨🇻" },
  "Saudi Arabia": { name: "Arabia Saudí", flag: "🇸🇦" },
  Uruguay: { name: "Uruguay", flag: "🇺🇾" },
  France: { name: "Francia", flag: "🇫🇷" },
  Senegal: { name: "Senegal", flag: "🇸🇳" },
  Iraq: { name: "Irak", flag: "🇮🇶" },
  Norway: { name: "Noruega", flag: "🇳🇴" },
  Argentina: { name: "Argentina", flag: "🇦🇷" },
  Algeria: { name: "Argelia", flag: "🇩🇿" },
  Austria: { name: "Austria", flag: "🇦🇹" },
  Jordan: { name: "Jordania", flag: "🇯🇴" },
  Portugal: { name: "Portugal", flag: "🇵🇹" },
  "DR Congo": { name: "R. D. Congo", flag: "🇨🇩" },
  Uzbekistan: { name: "Uzbekistán", flag: "🇺🇿" },
  Colombia: { name: "Colombia", flag: "🇨🇴" },
  England: {
    name: "Inglaterra",
    flag: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  },
  Croatia: { name: "Croacia", flag: "🇭🇷" },
  Ghana: { name: "Ghana", flag: "🇬🇭" },
  Panama: { name: "Panamá", flag: "🇵🇦" },
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
  if (match.score?.ft) {
    return "finished";
  }

  return startsAt.getTime() < Date.now() ? "awaitingResult" : "upcoming";
}

function scoreLabel(score?: Score) {
  if (!score?.ft) {
    return null;
  }

  const suffix = score.p
    ? ` pen. ${score.p[0]}-${score.p[1]}`
    : score.et
      ? " prórroga"
      : "";

  return `${score.ft[0]}-${score.ft[1]}${suffix}`;
}

function statusLabel(status: MatchStatus) {
  if (status === "finished") {
    return "Finalizado";
  }

  if (status === "awaitingResult") {
    return "Pendiente resultado";
  }

  return "Programado";
}

function groupShortName(group?: string) {
  return group?.replace("Group", "Grupo") ?? "Eliminatorias";
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
    if (!match.group) {
      continue;
    }

    if (!groups.has(match.group)) {
      groups.set(match.group, new Map());
    }

    const group = groups.get(match.group)!;
    group.set(match.team1, group.get(match.team1) ?? createStanding(match.team1));
    group.set(match.team2, group.get(match.team2) ?? createStanding(match.team2));

    if (!match.score?.ft) {
      continue;
    }

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
        .map((team) => ({
          ...team,
          goalDifference: team.goalsFor - team.goalsAgainst,
        }))
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

function buildVenueStats(matches: EnrichedMatch[]) {
  const venues = new Map<string, { name: string; matches: number; next?: EnrichedMatch }>();

  for (const match of matches) {
    if (!match.ground) {
      continue;
    }

    const venue = venues.get(match.ground) ?? {
      name: match.ground,
      matches: 0,
      next: undefined,
    };

    venue.matches += 1;
    if (match.status !== "finished" && (!venue.next || match.timestamp < venue.next.timestamp)) {
      venue.next = match;
    }
    venues.set(match.ground, venue);
  }

  return Array.from(venues.values()).sort((a, b) => b.matches - a.matches);
}

function buildGroupCards(matches: EnrichedMatch[]) {
  const groups = new Map<
    string,
    { group: string; teams: Set<string>; matches: EnrichedMatch[] }
  >();

  for (const match of matches) {
    if (!match.group) {
      continue;
    }

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

function isGroupMatch(match: EnrichedMatch) {
  return Boolean(match.group);
}

export function MundialApp() {
  const [activeTab, setActiveTab] = useState<TabId>("calendario");
  const [data, setData] = useState<TournamentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");

  useEffect(() => {
    let mounted = true;
    let controller = new AbortController();

    async function loadData() {
      try {
        const response = await fetch(DATA_URL, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const nextData = (await response.json()) as TournamentData;
        if (mounted) {
          setData(nextData);
          setUpdatedAt(new Date());
          setError(null);
        }
      } catch (nextError) {
        if (mounted && !(nextError instanceof DOMException)) {
          setError("No se han podido cargar los datos del calendario.");
        }
      }
    }

    loadData();
    const interval = window.setInterval(() => {
      controller.abort();
      controller = new AbortController();
      loadData();
    }, 300_000);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(interval);
    };
  }, []);

  const matches = useMemo(() => enrichMatches(data?.matches ?? []), [data]);
  const groups = useMemo(() => buildStandings(matches), [matches]);
  const venues = useMemo(() => buildVenueStats(matches), [matches]);
  const groupCards = buildGroupCards(matches);
  const groupOptions = useMemo(
    () => Array.from(new Set(matches.filter(isGroupMatch).map((match) => match.group!))),
    [matches],
  );
  const nextMatch = matches.find((match) => match.status !== "finished");
  const finishedCount = matches.filter((match) => match.status === "finished").length;
  const groupStageCount = matches.filter(isGroupMatch).length;
  const knockoutCount = matches.length - groupStageCount;

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
    const matchesStatus = statusFilter === "todos" || match.status === statusFilter;

    return matchesQuery && matchesGroup && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#f4f7fb]">
      <section className="border-b border-[#d8e1eb] bg-[#092033] text-white">
        <div className="container-shell grid gap-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9ad7c2]">
              Mundial 2026
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
              Calendario, horarios y clasificación del Mundial
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#c8d6e5]">
              Partidos ordenados por fecha, hora peninsular española, resultados
              y tablas de grupo calculadas automáticamente.
            </p>
          </div>

          <aside className="rounded-lg border border-white/15 bg-white/8 p-5 shadow-2xl shadow-black/20">
            <p className="text-sm font-semibold text-[#9ad7c2]">Proximo partido</p>
            {nextMatch ? (
              <div className="mt-4">
                <p className="text-2xl font-bold">
                  <TeamLabel team={nextMatch.team1} />
                  <span className="mx-2 text-[#9ad7c2]">vs</span>
                  <TeamLabel team={nextMatch.team2} />
                </p>
                <p className="mt-3 text-sm text-[#c8d6e5]">
                  {formatLongMadridDate(nextMatch.startsAt)} ·{" "}
                  {formatMadridTime(nextMatch.startsAt)}
                </p>
                <p className="mt-2 text-sm text-[#c8d6e5]">
                  {groupShortName(nextMatch.group)} · {nextMatch.ground}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#c8d6e5]">
                No hay partidos pendientes en la fuente actual.
              </p>
            )}
          </aside>
        </div>
      </section>

      <div className="container-shell py-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Partidos" value={matches.length || "104"} />
          <Metric label="Fase de grupos" value={groupStageCount || "72"} />
          <Metric label="Eliminatorias" value={knockoutCount || "32"} />
          <Metric label="Finalizados" value={finishedCount} />
        </div>

        <div className="mt-6 flex flex-col gap-4 rounded-lg border border-[#d8e1eb] bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex overflow-x-auto rounded-md bg-[#eef3f7] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`focus-ring min-h-10 rounded-md px-4 text-sm font-bold transition ${
                  activeTab === tab.id
                    ? "bg-[#0b4f8a] text-white shadow-sm"
                    : "text-[#526173] hover:bg-white hover:text-[#10243a]"
                }`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[#526173]">
            <Badge tone={error ? "status" : "neutral"}>
              {error ? "Datos no disponibles" : "Datos online"}
            </Badge>
            {updatedAt ? (
              <span>Actualizado {formatMadridTime(updatedAt)}</span>
            ) : (
              <span>Cargando calendario</span>
            )}
          </div>
        </div>

        {activeTab === "calendario" ? (
          <section className="mt-6">
            <div className="grid gap-3 rounded-lg border border-[#d8e1eb] bg-white p-4 shadow-sm lg:grid-cols-[1fr_220px_220px]">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#526173]">
                  Buscar
                </span>
                <input
                  className="mt-2 min-h-11 w-full rounded-md border border-[#ccd7e3] px-3 text-sm text-[#10243a] outline-none transition focus:border-[#0b4f8a] focus:ring-2 focus:ring-[#0b4f8a]/15"
                  placeholder="Equipo, ciudad, grupo..."
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#526173]">
                  Grupo
                </span>
                <select
                  className="mt-2 min-h-11 w-full rounded-md border border-[#ccd7e3] bg-white px-3 text-sm text-[#10243a] outline-none transition focus:border-[#0b4f8a] focus:ring-2 focus:ring-[#0b4f8a]/15"
                  value={groupFilter}
                  onChange={(event) => setGroupFilter(event.target.value)}
                >
                  <option value="todos">Todos</option>
                  {groupOptions.map((group) => (
                    <option key={group} value={group}>
                      {groupShortName(group)}
                    </option>
                  ))}
                  <option value="eliminatorias">Eliminatorias</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-[#526173]">
                  Estado
                </span>
                <select
                  className="mt-2 min-h-11 w-full rounded-md border border-[#ccd7e3] bg-white px-3 text-sm text-[#10243a] outline-none transition focus:border-[#0b4f8a] focus:ring-2 focus:ring-[#0b4f8a]/15"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="todos">Todos</option>
                  <option value="upcoming">Programados</option>
                  <option value="awaitingResult">Pendiente resultado</option>
                  <option value="finished">Finalizados</option>
                </select>
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {filteredMatches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "faseGrupos" ? (
          <section className="mt-6 grid gap-5 xl:grid-cols-2">
            {groupCards.map((group) => (
              <GroupFixtureCard
                key={group.group}
                group={group.group}
                teams={group.teams}
                matches={group.matches}
              />
            ))}
          </section>
        ) : null}

        {activeTab === "clasificacion" ? (
          <section className="mt-6 grid gap-5 xl:grid-cols-2">
            {groups.map((group) => (
              <GroupTable key={group.group} group={group.group} teams={group.teams} />
            ))}
          </section>
        ) : null}

        {activeTab === "sedes" ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {venues.map((venue) => (
              <article
                key={venue.name}
                className="rounded-lg border border-[#d8e1eb] bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-bold text-[#10243a]">{venue.name}</h2>
                  <Badge>{`${venue.matches} partidos`}</Badge>
                </div>
                {venue.next ? (
                  <div className="mt-5 rounded-md bg-[#eef7f3] p-4 text-sm text-[#214237]">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      <TeamLabel team={venue.next.team1} compact />
                      <span>vs</span>
                      <TeamLabel team={venue.next.team2} compact />
                    </p>
                    <p className="mt-2">
                      {formatMadridDate(venue.next.startsAt)} ·{" "}
                      {formatMadridTime(venue.next.startsAt)}
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-[#526173]">
                    Sin partidos pendientes en la fuente actual.
                  </p>
                )}
              </article>
            ))}
          </section>
        ) : null}

        <p className="mt-8 text-xs leading-5 text-[#526173]">
          Fuente configurable: openfootball/worldcup.json. La clasificación se
          recalcula en el navegador usando los marcadores disponibles en el JSON.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-[#d8e1eb] bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#526173]">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-[#10243a]">{value}</p>
    </div>
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
      className={`inline-flex min-w-0 items-center gap-2 ${
        align === "right" ? "justify-end" : ""
      }`}
    >
      {info.flag ? (
        <span
          className={`shrink-0 leading-none ${compact ? "text-base" : "text-xl"}`}
          aria-hidden="true"
        >
          {info.flag}
        </span>
      ) : null}
      <span className="min-w-0">{info.name}</span>
    </span>
  );
}

function MatchRow({ match }: { match: EnrichedMatch }) {
  const score = scoreLabel(match.score);

  return (
    <article className="grid gap-4 rounded-lg border border-[#d8e1eb] bg-white p-4 shadow-sm transition hover:border-[#0b4f8a]/55 md:grid-cols-[150px_1fr_180px] md:items-center">
      <div>
        <p className="text-sm font-bold capitalize text-[#10243a]">
          {formatMadridDate(match.startsAt)}
        </p>
        <p className="mt-1 text-sm text-[#526173]">{formatMadridTime(match.startsAt)}</p>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{groupShortName(match.group)}</Badge>
          <Badge>{match.round}</Badge>
          <Badge tone={match.status === "finished" ? "status" : "neutral"}>
            {statusLabel(match.status)}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <p className="text-lg font-bold text-[#10243a] sm:text-right">
            <TeamLabel team={match.team1} align="right" />
          </p>
          <p className="rounded-md bg-[#eef3f7] px-3 py-2 text-center text-sm font-black text-[#0b4f8a]">
            {score ?? "vs"}
          </p>
          <p className="text-lg font-bold text-[#10243a]">
            <TeamLabel team={match.team2} />
          </p>
        </div>
      </div>

      <div className="text-sm text-[#526173] md:text-right">
        <p className="font-semibold text-[#10243a]">{match.ground ?? "Sede por confirmar"}</p>
        {match.time ? <p className="mt-1">Hora local: {match.time}</p> : null}
      </div>
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
    <article className="overflow-hidden rounded-lg border border-[#d8e1eb] bg-white shadow-sm">
      <div className="border-b border-[#d8e1eb] bg-[#10243a] px-4 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{groupShortName(group)}</h2>
          <Badge>{`${matches.length} partidos`}</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {teams.map((team) => (
            <div
              key={team}
              className="rounded-md border border-white/15 bg-white/8 px-3 py-2 text-sm font-semibold"
            >
              <TeamLabel team={team} compact />
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[#edf1f5]">
        {matches.map((match) => (
          <MiniMatchRow key={match.id} match={match} />
        ))}
      </div>
    </article>
  );
}

function MiniMatchRow({ match }: { match: EnrichedMatch }) {
  const score = scoreLabel(match.score);

  return (
    <div className="grid gap-3 px-4 py-4 text-sm md:grid-cols-[120px_1fr_145px] md:items-center">
      <div className="text-[#526173]">
        <p className="font-bold capitalize text-[#10243a]">
          {formatMadridDate(match.startsAt)}
        </p>
        <p className="mt-1">{formatMadridTime(match.startsAt)}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <p className="font-bold text-[#10243a] sm:text-right">
          <TeamLabel team={match.team1} compact align="right" />
        </p>
        <p className="rounded-md bg-[#eef3f7] px-3 py-1.5 text-center text-xs font-black text-[#0b4f8a]">
          {score ?? "vs"}
        </p>
        <p className="font-bold text-[#10243a]">
          <TeamLabel team={match.team2} compact />
        </p>
      </div>
      <p className="text-[#526173] md:text-right">{match.ground}</p>
    </div>
  );
}

function GroupTable({ group, teams }: { group: string; teams: Standing[] }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[#d8e1eb] bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-[#d8e1eb] bg-[#10243a] px-4 py-3 text-white">
        <h2 className="text-lg font-bold">{groupShortName(group)}</h2>
        <Badge>{`${teams.length} equipos`}</Badge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-sm">
          <thead className="bg-[#eef3f7] text-left text-xs uppercase tracking-[0.1em] text-[#526173]">
            <tr>
              <th className="px-4 py-3">Equipo</th>
              <th className="px-3 py-3 text-center">PJ</th>
              <th className="px-3 py-3 text-center">G</th>
              <th className="px-3 py-3 text-center">E</th>
              <th className="px-3 py-3 text-center">P</th>
              <th className="px-3 py-3 text-center">GF</th>
              <th className="px-3 py-3 text-center">GC</th>
              <th className="px-3 py-3 text-center">DG</th>
              <th className="px-4 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#edf1f5]">
            {teams.map((team, index) => (
              <tr key={team.team} className={index < 2 ? "bg-[#f7fbf9]" : undefined}>
                <td className="px-4 py-3 font-bold text-[#10243a]">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-[#eef3f7] text-xs text-[#526173]">
                    {index + 1}
                  </span>
                  <TeamLabel team={team.team} compact />
                </td>
                <Cell>{team.played}</Cell>
                <Cell>{team.wins}</Cell>
                <Cell>{team.draws}</Cell>
                <Cell>{team.losses}</Cell>
                <Cell>{team.goalsFor}</Cell>
                <Cell>{team.goalsAgainst}</Cell>
                <Cell>{team.goalDifference}</Cell>
                <td className="px-4 py-3 text-center text-base font-black text-[#0b4f8a]">
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
  return <td className="px-3 py-3 text-center text-[#526173]">{children}</td>;
}
