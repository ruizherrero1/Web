import type { ThemeId } from "./types";

export const THEME_STORAGE_KEY = "madrid-theme-v1";

// Paleta del Real Madrid: blanco, dorado y azul marino. Reutiliza el mismo
// juego de variables --rm-* que consumen los componentes.
export const themes: Record<ThemeId, Record<string, string>> = {
  // Oscuro elegante (por defecto): azul noche + dorado.
  noche: {
    "--rm-page-bg": "#0a0f1c",
    "--rm-hero-from": "#0e1834",
    "--rm-hero-to": "#080d1a",
    "--rm-hero-border": "#1c2c52",
    "--rm-hero-label": "#e8c24a",
    "--rm-hero-soft": "#a9b8d6",
    "--rm-card-bg": "#101728",
    "--rm-card-header": "#13203f",
    "--rm-panel-bg": "#16203a",
    "--rm-accent": "#e8c24a",
    "--rm-accent-fg": "#0a0f1c",
    "--rm-text": "#eef2fb",
    "--rm-muted": "#7f90b3",
    "--rm-border": "#1c2c52",
    "--rm-border-inner": "#182444",
    "--rm-score-bg": "#132043",
    "--rm-score-text": "#e8c24a",
    "--rm-row-hl": "#122043",
    "--rm-win": "#22c55e",
    "--rm-draw": "#94a3b8",
    "--rm-loss": "#ef4444",
  },
  // Blanco clasico (merengue).
  blanco: {
    "--rm-page-bg": "#f2f5fa",
    "--rm-hero-from": "#0b1f4d",
    "--rm-hero-to": "#13315f",
    "--rm-hero-border": "#dde5f0",
    "--rm-hero-label": "#e8c24a",
    "--rm-hero-soft": "#c4d2e8",
    "--rm-card-bg": "#ffffff",
    "--rm-card-header": "#0b1f4d",
    "--rm-panel-bg": "#eef2f8",
    "--rm-accent": "#0b1f4d",
    "--rm-accent-fg": "#ffffff",
    "--rm-text": "#0d1729",
    "--rm-muted": "#5b6b86",
    "--rm-border": "#e0e6ef",
    "--rm-border-inner": "#eef1f6",
    "--rm-score-bg": "#eef2f8",
    "--rm-score-text": "#0b1f4d",
    "--rm-row-hl": "#fbf6e6",
    "--rm-win": "#16a34a",
    "--rm-draw": "#64748b",
    "--rm-loss": "#dc2626",
  },
  // Oro intenso sobre negro.
  oro: {
    "--rm-page-bg": "#0c0a05",
    "--rm-hero-from": "#241c07",
    "--rm-hero-to": "#100c03",
    "--rm-hero-border": "#3d2f0b",
    "--rm-hero-label": "#f4d35e",
    "--rm-hero-soft": "#cbb78a",
    "--rm-card-bg": "#161206",
    "--rm-card-header": "#231a08",
    "--rm-panel-bg": "#1f1809",
    "--rm-accent": "#f4d35e",
    "--rm-accent-fg": "#100c03",
    "--rm-text": "#f6efdc",
    "--rm-muted": "#a08f66",
    "--rm-border": "#3d2f0b",
    "--rm-border-inner": "#2c220a",
    "--rm-score-bg": "#251c08",
    "--rm-score-text": "#f4d35e",
    "--rm-row-hl": "#241c07",
    "--rm-win": "#4ade80",
    "--rm-draw": "#9ca3af",
    "--rm-loss": "#f87171",
  },
};

// El selector muestra solo la bolita de color; label para tooltip/aria.
export const themeConfigs: Record<ThemeId, { label: string; swatch: string }> = {
  noche: { label: "Noche", swatch: "#e8c24a" },
  blanco: { label: "Blanco", swatch: "#0b1f4d" },
  oro: { label: "Oro", swatch: "#f4d35e" },
};
