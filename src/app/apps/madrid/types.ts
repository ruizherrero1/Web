// Modelo de datos del apartado Real Madrid. A diferencia del Mundial (un torneo
// con grupos y eliminatoria), aqui seguimos a UN club a lo largo de la temporada
// en VARIAS competiciones a la vez (LaLiga, Champions, Copa, Supercopa, Mundial
// de Clubes), asi que la unidad basica es el partido con su competicion.

export type ThemeId = "noche" | "blanco" | "oro";
export type TabId = "partidos" | "clasificacion" | "plantilla" | "goleadores" | "ligas";

export type LeagueId = "esp.1" | "esp.2";

export type CompId =
  | "laliga"
  | "champions"
  | "copa"
  | "supercopa"
  | "mundialito";

export type MatchStatus = "finished" | "live" | "upcoming";

// Resultado desde el punto de vista del Madrid (solo en partidos terminados).
export type MadridResult = "W" | "D" | "L";

export type MadridMatch = {
  id: string;
  comp: CompId;
  compLabel: string;
  round?: string;
  startsAt: string; // ISO UTC
  date: string; // yyyy-mm-dd (UTC)
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  venue?: string;
  status: MatchStatus;
  statusDetail?: string; // "FT", "45'", "HT", etc.
  homeScore?: number;
  awayScore?: number;
  homePens?: number;
  awayPens?: number;
  isMadridHome: boolean;
  rival: string;
  rivalLogo?: string;
  result?: MadridResult;
  detailId?: number; // match_id de footballdata.io para el detalle (terminados)
  espnId?: string; // id de evento ESPN para el detalle en directo (once/cambios)
};

// Partido generico para el calendario general de ligas (cualquier equipo).
export type LeagueMatch = {
  id: string;
  startsAt: string;
  date: string;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  status: MatchStatus;
  statusDetail?: string;
  homeScore?: number;
  awayScore?: number;
  isMadrid: boolean;
};

export type LeagueCalendar = {
  matches: LeagueMatch[];
  teams: string[];
};

// Detalle en directo / pre-partido del Madrid (ESPN summary).
export type LiveEvent = {
  minute?: string;
  side: "home" | "away";
  type: "goal" | "yellow" | "red" | "sub";
  player: string;
  assist?: string;
  playerOut?: string;
};

export type LiveLineupPlayer = {
  name: string;
  number?: number;
  position?: string;
  subbedOut?: boolean;
  subbedIn?: boolean;
};

export type MatchLive = {
  status: MatchStatus;
  statusDetail?: string;
  home: string;
  away: string;
  homeScore?: number;
  awayScore?: number;
  events: LiveEvent[];
  lineups: {
    home: { starters: LiveLineupPlayer[]; bench: LiveLineupPlayer[] };
    away: { starters: LiveLineupPlayer[]; bench: LiveLineupPlayer[] };
  };
  hasLineups: boolean;
};

export type MatchGoal = {
  minute: number;
  extra?: number;
  side: "home" | "away";
  player: string;
  assist?: string;
};

export type LineupPlayer = {
  name: string;
  number?: number;
  position?: string;
  photo?: string;
};

export type MatchStatItem = {
  label: string;
  home: number;
  away: number;
  suffix?: string;
};

export type MatchDetail = {
  id: number;
  home: string;
  away: string;
  homeLogo?: string;
  awayLogo?: string;
  homeScore?: number;
  awayScore?: number;
  competition?: string;
  gameWeek?: number;
  venue?: string;
  attendance?: number;
  goals: MatchGoal[];
  lineups: { home: LineupPlayer[]; away: LineupPlayer[] };
  stats: MatchStatItem[];
  xg?: { home: number; away: number };
};

export type StandingRow = {
  rank: number;
  team: string;
  logo?: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  isMadrid: boolean;
};

export type SquadPlayer = {
  name: string;
  position: string; // grupo: Porteros / Defensas / Centrocampistas / Delanteros
  positionName: string; // posicion concreta (ej. Portero, Defensa)
  positionAbbr: string;
  number?: number;
  age?: number;
  height?: string; // ej. "1,85 m"
  weight?: string; // ej. "78 kg"
  country?: string;
  countryFlag?: string; // URL de la bandera
  photo?: string; // foto del jugador (footballdata.io; vacio si no hay)
  goals?: number; // goles en la temporada (footballdata.io)
  assists?: number; // asistencias en la temporada (footballdata.io)
  minutes?: number; // minutos jugados (footballdata.io)
  appearances?: number; // partidos (footballdata.io)
};

export type ChampionsStandings = {
  rows: StandingRow[];
  seasonYear?: number; // ej. 20252026
  isPrevious: boolean; // true si mostramos la temporada anterior
};

export type Scorer = {
  name: string;
  goals: number;
  assists: number;
  penalties: number;
  team?: string; // solo en clasificaciones de liga (no en las del propio Madrid)
  isMadrid?: boolean;
};

export type ScorerComp = "madrid" | "laliga" | "champions";

export type MadridData = {
  matches: MadridMatch[];
  season: number;
  source: string;
  generatedAt: string;
};
