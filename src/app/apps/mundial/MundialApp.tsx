"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlagImg,
  GroupFixtureCard,
  GroupTable,
  KnockoutRoundCard,
  MatchRow,
  SpainFilterButton,
  TeamLabel,
  ThemeSelector,
} from "./components";
import {
  SPAIN_TEAM,
  buildGroupCards,
  buildKnockoutRounds,
  buildStandings,
  enrichMatches,
  formatLongMadridDate,
  formatMadridTime,
  groupMatchesByDay,
  groupShortName,
  isGroupMatch,
  isTeamMatch,
  matchScoreLabel,
  normalizeText,
  displayTeamName,
  roundLabels,
} from "./helpers";
import { THEME_STORAGE_KEY, themes } from "./theme";
import type { StageFilter, TabId, ThemeId, TournamentData } from "./types";

const DATA_URL = process.env.NEXT_PUBLIC_WORLD_CUP_DATA_URL ?? "/api/mundial/data";
const OPENFOOTBALL_FALLBACK_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

const tabs: { id: TabId; label: string }[] = [
  { id: "calendario", label: "Calendario" },
  { id: "faseGrupos", label: "Grupos" },
  { id: "clasificacion", label: "Clasificación" },
];

type MundialAppProps = {
  initialData?: TournamentData | null;
};

export function MundialApp({ initialData = null }: MundialAppProps) {
  const [activeTab, setActiveTab] = useState<TabId>("calendario");
  const [activeTheme, setActiveTheme] = useState<ThemeId>("night");
  const [data, setData] = useState<TournamentData | null>(initialData);
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
          // El cache compartido del servidor evita que cada cliente consulte
          // directamente a los proveedores de resultados.
          const today = new Date().toISOString().slice(0, 10);
          const hasLive = nextData.matches.some((m) =>
            ["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT"].includes(m.matchStatus ?? ""),
          );
          const hasMatchToday = nextData.matches.some((m) => m.date === today);
          // Live o dia de partido: 60 s. Sin partido: 15 min.
          const delay = hasLive || hasMatchToday ? 60_000 : 15 * 60_000;
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
