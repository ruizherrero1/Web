import { SPAIN_TEAM, isTeamMatch } from "./helpers";
import type { EnrichedMatch } from "./types";

export type BroadcastChannel = {
  name: string;
  detail: string;
  url: string;
  free?: boolean;
  unconfirmed?: boolean;
};

// Derechos del Mundial 2026 en España: DAZN emite los 104 partidos (tambien
// via Movistar Plus+, dial 57) y RTVE una seleccion de 34 en abierto,
// incluidos todos los de Espana.
// Partidos ya confirmados en La 1 ademas de los de Espana (clave: equipos
// ordenados alfabeticamente, nombres tal y como llegan de la API).
const RTVE_CONFIRMED = new Set([
  "Mexico|South Africa",
  "Bosnia & Herzegovina|Canada",
  "Qatar|Switzerland",
  "Brazil|Morocco",
]);

function matchPairKey(match: EnrichedMatch) {
  return [match.team1, match.team2].sort().join("|");
}

export function getBroadcastChannels(match: EnrichedMatch): BroadcastChannel[] {
  const onRtve = isTeamMatch(match, SPAIN_TEAM) || RTVE_CONFIRMED.has(matchPairKey(match));

  const channels: BroadcastChannel[] = [];

  if (onRtve) {
    channels.push({
      name: "La 1 (RTVE)",
      detail: "Gratis en abierto · también en RTVE Play",
      url: "https://www.rtve.es/play/",
      free: true,
    });
  }

  channels.push(
    {
      name: "DAZN",
      detail: "Todos los partidos del Mundial",
      url: "https://www.dazn.com/es-ES/home",
    },
    {
      name: "Movistar Plus+",
      detail: "Canales DAZN Mundial (dial 57) · Fútbol Total / LALIGA",
      url: "https://www.movistarplus.es/",
    },
  );

  if (!onRtve) {
    channels.push({
      name: "RTVE / Teledeporte",
      detail: "Emite una selección en abierto — comprueba la guía de RTVE",
      url: "https://www.rtve.es/play/",
      free: true,
      unconfirmed: true,
    });
  }

  return channels;
}
