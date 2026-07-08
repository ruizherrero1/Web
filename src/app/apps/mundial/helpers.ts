import type {
  EnrichedMatch,
  MatchStatus,
  RawMatch,
  Score,
  Standing,
  TeamInfo,
} from "./types";

export const MADRID_TIME_ZONE = "Europe/Madrid";
export const SPAIN_TEAM = "Spain";

export const roundLabels: Record<string, string> = {
  "Round of 32": "Dieciseisavos",
  "Round of 16": "Octavos",
  "Quarter-final": "Cuartos",
  "Quarter-finals": "Cuartos",
  "Quarter-finals 1": "Cuartos",
  "Semi-final": "Semis",
  "Semi-finals": "Semis",
  "Semi-finals 1": "Semis",
  "Third-place match": "3er puesto",
  "Third-place play-off": "3er puesto",
  "Match for third place": "3er puesto",
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

export function getTeamInfo(team: string): TeamInfo {
  return teamInfo[team] ?? { name: team };
}

export function displayTeamName(team: string) {
  return getTeamInfo(team).name;
}

export function parseKickoff(date: string, time?: string) {
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

export function formatMadridDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: MADRID_TIME_ZONE,
  }).format(date);
}

export function formatMadridTime(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MADRID_TIME_ZONE,
    timeZoneName: "short",
  }).format(date);
}

export function formatLongMadridDate(date: Date) {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: MADRID_TIME_ZONE,
  }).format(date);
}

export function getStatus(match: RawMatch, startsAt: Date): MatchStatus {
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

export function scoreLabel(score?: Score) {
  if (!score?.ft) return null;
  const suffix = score.p
    ? ` (pen. ${score.p[0]} - ${score.p[1]})`
    : score.et
      ? " prórroga"
      : "";
  return `${score.ft[0]} - ${score.ft[1]}${suffix}`;
}

export function penaltyWinnerTeam(match: RawMatch) {
  if (
    match.matchStatus &&
    ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(match.matchStatus)
  ) {
    return null;
  }

  const penalties = match.score?.p;
  if (!penalties || penalties[0] === penalties[1]) return null;
  return penalties[0] > penalties[1] ? match.team1 : match.team2;
}

export function penaltyWinnerLabel(match: RawMatch) {
  const winner = penaltyWinnerTeam(match);
  return winner ? `Gana ${displayTeamName(winner)} por penaltis` : null;
}

export function matchScoreLabel(match: EnrichedMatch) {
  const score = scoreLabel(match.score);
  if (score) {
    return score;
  }

  if (match.status === "live") {
    return "0 - 0";
  }

  return "- vs -";
}

export function groupShortName(group?: string) {
  return group?.replace("Group", "Grupo") ?? "Eliminatorias";
}

// Minuto de juego para partidos en directo: usa el de la API si llega y, si
// no, lo estima desde la hora de inicio (con ~ para indicar aproximacion).
export function liveMinuteLabel(match: EnrichedMatch) {
  if (match.status !== "live") return "";
  if (match.matchStatus === "PAUSED") return "Descanso";
  if (match.matchStatus === "PENALTY_SHOOTOUT") return "Penaltis";
  if (typeof match.minute === "number" && match.minute > 0) return `${match.minute}'`;
  const elapsed = Math.floor((Date.now() - match.timestamp) / 60_000);
  if (elapsed < 1) return "1'";
  return `~${Math.min(elapsed, 130)}'`;
}

// Cuenta atras compacta: "3 d 14 h", "2 h 5 min" o "12 min".
export function countdownLabel(target: number, now: number) {
  const minutes = Math.floor((target - now) / 60_000);
  if (minutes <= 0) return "";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${mins} min`;
  return `${mins} min`;
}

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function enrichMatches(matches: RawMatch[]): EnrichedMatch[] {
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

function compareStandings(a: Standing, b: Standing) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor ||
    a.team.localeCompare(b.team)
  );
}

export function buildStandings(matches: EnrichedMatch[]) {
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
        .sort(compareStandings),
    }))
    .sort((a, b) => a.group.localeCompare(b.group));
}

type StandingGroup = {
  group: string;
  teams: Standing[];
};

type KnockoutRound = {
  round: string;
  matches: EnrichedMatch[];
  firstTs: number;
};

type ThirdPlaceSlot = {
  key: string;
  eligibleGroups: string[];
};

function groupLetter(group: string) {
  return group.replace(/^Group\s+/i, "").trim().toUpperCase();
}

function thirdPlaceGroups(slot: string) {
  const named = slot.match(/^Third Place Group\s+([A-L](?:\/[A-L])+)$/i);
  const compact = slot.match(/^3([A-L](?:\/[A-L])+)$/i);
  return (named?.[1] ?? compact?.[1])?.toUpperCase().split("/") ?? null;
}

function isKnockoutPlaceholder(team: string) {
  return (
    /^Group [A-L] (?:Winner|2nd Place)$/i.test(team) ||
    /^[12][A-L]$/i.test(team) ||
    thirdPlaceGroups(team) !== null
  );
}

function projectedTopTwo(team: string, standings: Map<string, Standing[]>) {
  const named = team.match(/^Group ([A-L]) (Winner|2nd Place)$/i);
  const compact = team.match(/^([12])([A-L])$/i);

  if (named) {
    return standings.get(named[1].toUpperCase())?.[named[2] === "Winner" ? 0 : 1]?.team;
  }

  if (compact) {
    return standings.get(compact[2].toUpperCase())?.[Number(compact[1]) - 1]?.team;
  }

  return undefined;
}

function assignProjectedThirds(
  slots: ThirdPlaceSlot[],
  thirdTeams: { group: string; team: string }[],
) {
  const assignments = new Map<string, string>();
  const orderedSlots = [...slots].sort((a, b) => {
    const availableA = thirdTeams.filter((team) => a.eligibleGroups.includes(team.group)).length;
    const availableB = thirdTeams.filter((team) => b.eligibleGroups.includes(team.group)).length;
    return availableA - availableB;
  });

  function assign(index: number, usedGroups: Set<string>): boolean {
    if (index === orderedSlots.length) return true;

    const slot = orderedSlots[index];
    for (const candidate of thirdTeams) {
      if (
        usedGroups.has(candidate.group) ||
        !slot.eligibleGroups.includes(candidate.group)
      ) {
        continue;
      }

      assignments.set(slot.key, candidate.team);
      usedGroups.add(candidate.group);
      if (assign(index + 1, usedGroups)) return true;
      usedGroups.delete(candidate.group);
      assignments.delete(slot.key);
    }

    return false;
  }

  assign(0, new Set());
  return assignments;
}

export function projectKnockoutRounds(
  rounds: KnockoutRound[],
  groups: StandingGroup[],
) {
  const standings = new Map(
    groups.map((group) => [groupLetter(group.group), group.teams]),
  );
  const firstRound = rounds.find((round) => /round of 32/i.test(round.round));
  if (!firstRound) return rounds;

  const actualTeams = new Set(
    firstRound.matches
      .flatMap((match) => [match.team1, match.team2])
      .filter((team) => !isKnockoutPlaceholder(team)),
  );
  const projectedThirds = groups
    .map((group) => ({
      group: groupLetter(group.group),
      standing: group.teams[2],
    }))
    .filter(
      (entry): entry is { group: string; standing: Standing } =>
        Boolean(entry.standing) && !actualTeams.has(entry.standing.team),
    )
    .sort((a, b) => compareStandings(a.standing, b.standing))
    .slice(0, 8)
    .map((entry) => ({ group: entry.group, team: entry.standing.team }));

  const thirdSlots = firstRound.matches.flatMap((match) =>
    (["team1", "team2"] as const).flatMap((side) => {
      const eligibleGroups = thirdPlaceGroups(match[side]);
      return eligibleGroups
        ? [{ key: `${match.id}:${side}`, eligibleGroups }]
        : [];
    }),
  );
  const thirdAssignments = assignProjectedThirds(thirdSlots, projectedThirds);

  return rounds.map((round) => {
    if (round !== firstRound) return round;

    return {
      ...round,
      matches: round.matches.map((match) => {
        function resolveTeam(side: "team1" | "team2") {
          const team = match[side];
          if (thirdPlaceGroups(team)) {
            return thirdAssignments.get(`${match.id}:${side}`) ?? team;
          }
          return projectedTopTwo(team, standings) ?? team;
        }

        return {
          ...match,
          team1: resolveTeam("team1"),
          team2: resolveTeam("team2"),
        };
      }),
    };
  });
}
export function buildGroupCards(matches: EnrichedMatch[]) {
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

export function buildKnockoutRounds(matches: EnrichedMatch[]) {
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

export function groupMatchesByDay(
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

export function isGroupMatch(match: EnrichedMatch) {
  return Boolean(match.group);
}

export function isTeamMatch(match: EnrichedMatch, team: string) {
  return match.team1 === team || match.team2 === team;
}
