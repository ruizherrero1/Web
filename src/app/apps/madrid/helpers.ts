import type { CompId, MadridMatch } from "./types";

export const MADRID_TIME_ZONE = "Europe/Madrid";

export const COMP_LABELS: Record<CompId, string> = {
  laliga: "LaLiga",
  champions: "Champions",
  copa: "Copa del Rey",
  supercopa: "Supercopa",
  mundialito: "Mundial de Clubes",
};

// Color por competicion para el badge (sobre fondos oscuros y claros).
export const COMP_COLORS: Record<CompId, { bg: string; color: string }> = {
  laliga: { bg: "#e5322a", color: "#ffffff" },
  champions: { bg: "#0b1f4d", color: "#ffffff" },
  copa: { bg: "#c9a227", color: "#1a1400" },
  supercopa: { bg: "#0a7d4b", color: "#ffffff" },
  mundialito: { bg: "#6d28d9", color: "#ffffff" },
};

export function isMadrid(name: string): boolean {
  return /real madrid/i.test(name);
}

export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function formatMadridDate(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: MADRID_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatLongMadridDate(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: MADRID_TIME_ZONE,
  }).format(new Date(iso));
}

export function formatMadridTime(iso: string | Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MADRID_TIME_ZONE,
    timeZoneName: "short",
  }).format(typeof iso === "string" ? new Date(iso) : iso);
}

// Marcador con penaltis si los hubo (p.ej. "1 (4) - 1 (3)").
export function scoreLabel(match: MadridMatch): string {
  if (
    match.status === "upcoming" ||
    match.homeScore === undefined ||
    match.awayScore === undefined
  ) {
    return "vs";
  }
  const pens =
    match.homePens !== undefined && match.awayPens !== undefined
      ? { home: ` (${match.homePens})`, away: ` (${match.awayPens})` }
      : { home: "", away: "" };
  return `${match.homeScore}${pens.home} - ${match.awayScore}${pens.away}`;
}

// Cuenta atras compacta para el hero: "2d 4h", "3h 12m", "8m".
export function countdownLabel(targetIso: string, now: number): string {
  const diff = new Date(targetIso).getTime() - now;
  if (diff <= 0) return "";
  const minutes = Math.floor(diff / 60_000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
