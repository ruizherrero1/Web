export type ThemeId = "fifa" | "night" | "northamerica";
export type TabId = "calendario" | "faseGrupos" | "clasificacion";
export type StageFilter = `group:${string}` | `round:${string}` | "todos";
export type MatchStatus = "finished" | "live" | "awaitingResult" | "upcoming";

export type Score = {
  ft?: [number, number];
  ht?: [number, number];
  et?: [number, number];
  p?: [number, number];
};

export type RawMatch = {
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

export type TournamentData = {
  name: string;
  matches: RawMatch[];
  source?: string;
  generatedAt?: string;
};

export type EnrichedMatch = RawMatch & {
  id: string;
  startsAt: Date;
  timestamp: number;
  status: MatchStatus;
};

export type Standing = {
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

export type TeamInfo = {
  name: string;
  countryCode?: string;
};
