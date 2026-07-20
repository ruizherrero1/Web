"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CompBadge,
  LiveBadge,
  MatchRow,
  ScorersTable,
  SquadList,
  StandingsTable,
  ThemeSelector,
} from "./components";
import {
  countdownLabel,
  formatLongMadridDate,
  formatMadridTime,
  normalizeText,
  scoreLabel,
} from "./helpers";
import { THEME_STORAGE_KEY, themes } from "./theme";
import type {
  ChampionsStandings,
  MadridData,
  MadridMatch,
  Scorer,
  SquadPlayer,
  StandingRow,
  TabId,
  ThemeId,
} from "./types";

const DATA_URL = "/api/madrid/data";

const tabs: { id: TabId; label: string; short: string }[] = [
  { id: "partidos", label: "Partidos", short: "Partidos" },
  { id: "clasificacion", label: "Clasificación", short: "Clasif." },
  { id: "plantilla", label: "Plantilla", short: "Plantilla" },
  { id: "goleadores", label: "Goleadores", short: "Goles" },
];

type TimeFilter = "proximos" | "resultados" | "todos";

type MadridAppProps = {
  initialData?: MadridData | null;
};

export function MadridApp({ initialData = null }: MadridAppProps) {
  const [activeTab, setActiveTab] = useState<TabId>("partidos");
  const [activeTheme, setActiveTheme] = useState<ThemeId>("noche");
  const [data, setData] = useState<MadridData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [query, setQuery] = useState("");
  const [compFilter, setCompFilter] = useState<string>("todas");
  // Lideramos siempre con los proximos partidos; si aun no hay calendario
  // publicado, el estado vacio lo explica y quedan los Resultados a un clic.
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("proximos");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const hasAutoScrolled = useRef(false);

  const [standings, setStandings] = useState<StandingRow[] | null>(null);
  const [standingsView, setStandingsView] = useState<"laliga" | "champions">("laliga");
  const [champions, setChampions] = useState<ChampionsStandings | null>(null);
  const [squad, setSquad] = useState<SquadPlayer[] | null>(null);
  const [scorers, setScorers] = useState<Scorer[] | null>(null);

  // Reloj para la cuenta atras del hero.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const initialId = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(initialId);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
    if (!saved || !(saved in themes)) return undefined;
    const frame = window.requestAnimationFrame(() => setActiveTheme(saved));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    if (isStandalone) document.body.dataset.madridStandalone = "true";
    return () => {
      delete document.body.dataset.madridStandalone;
    };
  }, []);

  function handleThemeChange(theme: ThemeId) {
    setActiveTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }

  // Carga de partidos con polling adaptativo (60 s en dia de partido).
  useEffect(() => {
    let mounted = true;
    let controller = new AbortController();
    let timeoutId: number | undefined;

    async function loadData() {
      setIsLoading(true);
      try {
        const response = await fetch(DATA_URL, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const nextData = (await response.json()) as MadridData;
        if (!mounted) return;
        setData(nextData);
        setUpdatedAt(new Date());
        setError(null);
        setIsLoading(false);
        const today = new Date().toISOString().slice(0, 10);
        const hasLive = nextData.matches.some((m) => m.status === "live");
        const hasMatchToday = nextData.matches.some((m) => m.date === today);
        const delay = hasLive || hasMatchToday ? 60_000 : 15 * 60_000;
        timeoutId = window.setTimeout(() => {
          controller.abort();
          controller = new AbortController();
          loadData();
        }, delay);
      } catch (nextError) {
        if (mounted && !(nextError instanceof DOMException)) {
          setError("No se han podido cargar los partidos.");
          setIsLoading(false);
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

  // Carga perezosa por pestana.
  useEffect(() => {
    if (activeTab === "clasificacion" && standings === null) {
      fetch("/api/madrid/standings", { cache: "no-store" })
        .then((r) => r.json())
        .then((p) => setStandings(Array.isArray(p.standings) ? p.standings : []))
        .catch(() => setStandings([]));
    }
    if (activeTab === "plantilla" && squad === null) {
      fetch("/api/madrid/squad", { cache: "no-store" })
        .then((r) => r.json())
        .then((p) => setSquad(Array.isArray(p.squad) ? p.squad : []))
        .catch(() => setSquad([]));
    }
    if (activeTab === "clasificacion" && standingsView === "champions" && champions === null) {
      fetch("/api/madrid/champions", { cache: "no-store" })
        .then((r) => r.json())
        .then((p) => setChampions({ rows: Array.isArray(p.rows) ? p.rows : [], isPrevious: !!p.isPrevious, seasonYear: p.seasonYear }))
        .catch(() => setChampions({ rows: [], isPrevious: false }));
    }
    if (activeTab === "goleadores" && scorers === null) {
      fetch("/api/madrid/scorers", { cache: "no-store" })
        .then((r) => r.json())
        .then((p) => setScorers(Array.isArray(p.scorers) ? p.scorers : []))
        .catch(() => setScorers([]));
    }
  }, [activeTab, standings, squad, scorers, standingsView, champions]);

  function handleRefresh() {
    setRefreshTick((t) => t + 1);
  }

  const matches = useMemo(() => data?.matches ?? [], [data]);

  const liveMatch = matches.find((m) => m.status === "live");
  const nextMatch = matches.find((m) => m.status === "upcoming");
  const heroMatch = liveMatch ?? nextMatch;
  const isHeroLive = heroMatch?.status === "live";
  const countdown =
    heroMatch && !isHeroLive && now ? countdownLabel(heroMatch.startsAt, now) : "";

  // Racha: ultimos 5 resultados terminados.
  const lastResults = useMemo(
    () =>
      matches
        .filter((m) => m.status === "finished" && m.result)
        .slice(-5)
        .map((m) => m.result as "W" | "D" | "L"),
    [matches],
  );

  const compOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const match of matches) seen.set(match.comp, match.compLabel);
    return Array.from(seen.entries());
  }, [matches]);

  const normalizedQuery = normalizeText(query.trim());
  const filteredMatches = useMemo(() => {
    let list = matches.filter((match) => {
      const matchesComp = compFilter === "todas" || match.comp === compFilter;
      const matchesQuery =
        !normalizedQuery ||
        normalizeText(`${match.home} ${match.away} ${match.compLabel} ${match.venue ?? ""}`).includes(
          normalizedQuery,
        );
      const matchesTime =
        timeFilter === "todos" ||
        (timeFilter === "proximos" && match.status !== "finished") ||
        (timeFilter === "resultados" && match.status === "finished");
      return matchesComp && matchesQuery && matchesTime;
    });
    // En "Resultados" mostramos lo mas reciente primero.
    if (timeFilter === "resultados") list = [...list].reverse();
    return list;
  }, [matches, compFilter, normalizedQuery, timeFilter]);

  const nextMatchId = filteredMatches.find((m) => m.status !== "finished")?.id;

  useEffect(() => {
    if (activeTab !== "partidos" || hasAutoScrolled.current || !nextMatchId) return;
    const element = document.getElementById(`rm-${nextMatchId}`);
    if (element) {
      element.scrollIntoView({ block: "center" });
      hasAutoScrolled.current = true;
    }
  }, [activeTab, nextMatchId]);

  useEffect(() => {
    function onScroll() {
      setShowScrollTop(window.scrollY > 300);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen bg-[var(--rm-page-bg)] text-[var(--rm-text)]"
      style={themes[activeTheme] as React.CSSProperties}
    >
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--rm-hero-border)] bg-gradient-to-br from-[var(--rm-hero-from)] to-[var(--rm-hero-to)] text-white">
        <div className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <span className="absolute -right-8 -top-12 text-[20rem] leading-none opacity-[0.05]">👑</span>
        </div>
        <div className="container-shell relative py-5 lg:py-10">
          <div className="mb-3 flex justify-end lg:mb-6">
            <ThemeSelector activeTheme={activeTheme} onThemeChange={handleThemeChange} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-8">
            <div>
              <div className="flex items-center gap-3 sm:gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/madrid-crest.png"
                  alt="Escudo del Real Madrid"
                  width={72}
                  height={93}
                  className="h-16 w-auto drop-shadow-lg sm:h-20 lg:h-24"
                />
                <h1 className="text-4xl font-black leading-[1.05] sm:text-5xl lg:text-6xl">
                  REAL MADRID
                </h1>
              </div>
              <p className="mt-2 hidden max-w-2xl text-base leading-7 text-[var(--rm-hero-soft)] sm:mt-4 sm:block">
                Calendario, resultados, clasificación y plantilla — todas las competiciones, con
                horarios en España.
              </p>
              {lastResults.length > 0 ? (
                <div className="mt-3 flex items-center gap-2 sm:mt-4">
                  <span className="text-xs font-semibold text-[var(--rm-hero-soft)]">Racha:</span>
                  <span className="flex items-center gap-1">
                    {lastResults.map((result, index) => (
                      <span
                        key={index}
                        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black text-white"
                        style={{
                          background:
                            result === "W" ? "#22c55e" : result === "D" ? "#94a3b8" : "#ef4444",
                        }}
                      >
                        {result === "W" ? "G" : result === "D" ? "E" : "P"}
                      </span>
                    ))}
                  </span>
                </div>
              ) : null}
            </div>

            <aside className="rounded-xl border border-white/15 bg-white/[0.08] p-5 shadow-2xl shadow-black/20">
              <p className="flex items-center gap-2 text-sm font-semibold text-[var(--rm-hero-label)]">
                {isHeroLive ? (
                  <LiveBadge minute={heroMatch?.statusDetail ?? undefined} />
                ) : (
                  "Próximo partido"
                )}
              </p>
              {heroMatch ? (
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2 text-lg font-bold">
                    <span>{heroMatch.home}</span>
                    {isHeroLive ? (
                      <span className="shrink-0 rounded bg-white/15 px-2.5 py-1 text-sm font-black">
                        {scoreLabel(heroMatch)}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-[var(--rm-hero-label)]">vs</span>
                    )}
                    <span>{heroMatch.away}</span>
                  </div>
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--rm-hero-soft)]">
                    <CompBadge comp={heroMatch.comp} label={heroMatch.compLabel} />
                    <span>
                      {formatLongMadridDate(heroMatch.startsAt)} · {formatMadridTime(heroMatch.startsAt)}
                    </span>
                  </p>
                  {!isHeroLive && countdown ? (
                    <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1.5 text-sm font-semibold">
                      Empieza en {countdown}
                    </p>
                  ) : null}
                  {heroMatch.venue ? (
                    <p className="mt-2 text-sm text-[var(--rm-hero-soft)]">{heroMatch.venue}</p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm text-[var(--rm-hero-soft)]">
                  No hay partidos programados por ahora.
                </p>
              )}
            </aside>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="container-shell pt-4 pb-8 sm:py-8">
        <div className="flex flex-col gap-4 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-4 rounded-md bg-[var(--rm-panel-bg)] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`focus-ring min-h-10 rounded-md px-2 text-center text-xs font-bold transition sm:text-sm ${
                  activeTab === tab.id
                    ? "bg-[var(--rm-accent)] text-[var(--rm-accent-fg)] shadow-sm"
                    : "text-[var(--rm-muted)] hover:text-[var(--rm-text)]"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--rm-muted)]">
            <button
              type="button"
              title="Pulsa para actualizar"
              disabled={isLoading}
              onClick={handleRefresh}
              className="inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--rm-text)] transition hover:border-[var(--rm-accent)] hover:text-[var(--rm-accent)] disabled:cursor-wait disabled:opacity-60"
            >
              <span className={isLoading ? "inline-block animate-spin" : ""}>↻</span>
              {isLoading ? "Actualizando…" : error ? "Error — reintentar" : "Actualizar"}
            </button>
            {updatedAt ? <span>Actualizado {formatMadridTime(updatedAt)}</span> : <span>Cargando…</span>}
          </div>
        </div>

        {activeTab === "partidos" ? (
          <section className="mt-6">
            <div className="flex flex-wrap gap-2 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-3 shadow-sm">
              <div className="grid grid-cols-3 rounded-md bg-[var(--rm-panel-bg)] p-1">
                {(
                  [
                    ["proximos", "Próximos"],
                    ["resultados", "Resultados"],
                    ["todos", "Todos"],
                  ] as [TimeFilter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTimeFilter(key)}
                    className={`focus-ring min-h-9 rounded-md px-3 text-sm font-bold transition ${
                      timeFilter === key
                        ? "bg-[var(--rm-accent)] text-[var(--rm-accent-fg)]"
                        : "text-[var(--rm-muted)] hover:text-[var(--rm-text)]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                aria-label="Buscar rival, competición o estadio"
                className="min-h-9 min-w-0 flex-[1_1_150px] rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel-bg)] px-3 text-sm text-[var(--rm-text)] outline-none transition focus:border-[var(--rm-accent)]"
                placeholder="Buscar..."
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                aria-label="Filtrar por competición"
                className="min-h-9 rounded-md border border-[var(--rm-border)] bg-[var(--rm-panel-bg)] px-2 text-sm text-[var(--rm-text)] outline-none transition focus:border-[var(--rm-accent)]"
                value={compFilter}
                onChange={(event) => setCompFilter(event.target.value)}
              >
                <option value="todas">Competición</option>
                {compOptions.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 space-y-3">
              {filteredMatches.length > 0 ? (
                filteredMatches.map((match: MadridMatch) => (
                  <MatchRow key={match.id} match={match} domId={`rm-${match.id}`} />
                ))
              ) : timeFilter === "proximos" ? (
                <div className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-5 text-sm text-[var(--rm-muted)]">
                  <p className="font-semibold text-[var(--rm-text)]">
                    Aún no hay próximos partidos publicados.
                  </p>
                  <p className="mt-1">
                    El calendario de la temporada 26/27 aparecerá aquí en cuanto la fuente lo
                    publique.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTimeFilter("resultados")}
                    className="mt-3 inline-flex min-h-9 items-center rounded-md bg-[var(--rm-accent)] px-3 text-sm font-bold text-[var(--rm-accent-fg)]"
                  >
                    Ver últimos resultados
                  </button>
                </div>
              ) : (
                <p className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-4 text-sm text-[var(--rm-muted)]">
                  No hay partidos que coincidan con el filtro.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {activeTab === "clasificacion" ? (
          <section className="mt-6">
            <div className="mb-4 grid grid-cols-2 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-1 shadow-sm">
              {(
                [
                  ["laliga", "LaLiga"],
                  ["champions", "Champions"],
                ] as ["laliga" | "champions", string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStandingsView(key)}
                  className={`focus-ring min-h-10 rounded-md px-3 text-sm font-bold transition ${
                    standingsView === key
                      ? "bg-[var(--rm-accent)] text-[var(--rm-accent-fg)] shadow-sm"
                      : "text-[var(--rm-muted)] hover:text-[var(--rm-text)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {standingsView === "laliga" ? (
              standings === null ? (
                <p className="text-sm text-[var(--rm-muted)]">Cargando clasificación…</p>
              ) : standings.length > 0 ? (
                <StandingsTable rows={standings} />
              ) : (
                <p className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-4 text-sm text-[var(--rm-muted)]">
                  La clasificación de LaLiga aún no está disponible.
                </p>
              )
            ) : champions === null ? (
              <p className="text-sm text-[var(--rm-muted)]">Cargando Champions…</p>
            ) : champions.rows.length > 0 ? (
              <StandingsTable
                rows={champions.rows}
                title="Champions League"
                note={champions.isPrevious ? "temporada anterior" : undefined}
              />
            ) : (
              <p className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-4 text-sm text-[var(--rm-muted)]">
                La fase de liga de la Champions 26/27 se sorteará en agosto.
              </p>
            )}
          </section>
        ) : null}

        {activeTab === "plantilla" ? (
          <section className="mt-6">
            {squad === null ? (
              <p className="text-sm text-[var(--rm-muted)]">Cargando plantilla…</p>
            ) : squad.length > 0 ? (
              <SquadList players={squad} />
            ) : (
              <p className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-4 text-sm text-[var(--rm-muted)]">
                La plantilla aún no está disponible.
              </p>
            )}
          </section>
        ) : null}

        {activeTab === "goleadores" ? (
          <section className="mt-6">
            {scorers === null ? (
              <p className="text-sm text-[var(--rm-muted)]">Cargando goleadores…</p>
            ) : scorers.length > 0 ? (
              <ScorersTable scorers={scorers} />
            ) : (
              <p className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-4 text-sm text-[var(--rm-muted)]">
                La tabla de goleadores se llena en cuanto empiece LaLiga.
              </p>
            )}
          </section>
        ) : null}

        <p className="mt-8 text-xs leading-5 text-[var(--rm-muted)]">
          Datos: ESPN · football-data.org
        </p>
      </div>

      <button
        type="button"
        aria-label="Volver arriba"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`fixed bottom-6 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--rm-accent)] text-[var(--rm-accent-fg)] shadow-lg transition-all duration-300 ${
          showScrollTop ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}
