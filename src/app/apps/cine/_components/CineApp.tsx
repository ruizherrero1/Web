"use client";

import {
  BookmarkPlus,
  Check,
  Clapperboard,
  ExternalLink,
  Film,
  Home,
  Info,
  Play,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Tv,
  Users,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { demoTitles, pendingCategories, profiles, providers } from "../_lib/cine-data";
import type { CineTitle, MediaKind, MonetizationType, PendingCategory, ProfileKey, ProviderKey, TitleDetail, WatchStatus } from "../_lib/types";

type TabKey = "home" | "explore" | "pending" | "ratings";

type SortKey = "top_rated" | "popular" | "recent";

type RatingSource = "tmdb" | "imdb" | "rt" | "metacritic";

type WatchFilter = "all" | "unseen_together" | "watched_rr" | "watched_lb" | "no_rating_mine" | "pending";

type Filters = {
  query: string;
  kind: "all" | MediaKind;
  providers: ProviderKey[];
  monetization: "all" | MonetizationType;
  ratingSource: RatingSource;
  minScore: number;
  watch: WatchFilter;
  sort: SortKey;
};

const initialFilters: Filters = {
  query: "",
  kind: "all",
  providers: [],
  monetization: "all",
  ratingSource: "tmdb",
  minScore: 0,
  watch: "all",
  sort: "top_rated"
};

const ratingSources: Record<RatingSource, { label: string; unit: "ten" | "percent" }> = {
  tmdb: { label: "TMDB", unit: "ten" },
  imdb: { label: "IMDb", unit: "ten" },
  rt: { label: "Rotten Tomatoes", unit: "percent" },
  metacritic: { label: "Metacritic", unit: "percent" }
};

const watchFilterLabels: Record<WatchFilter, string> = {
  all: "Todas",
  unseen_together: "Sin ver juntos",
  watched_rr: "Vistas RR",
  watched_lb: "Vistas LB",
  no_rating_mine: "Sin nota mia",
  pending: "En pendientes"
};

const navItems = [
  { key: "home", label: "Inicio", icon: Home },
  { key: "explore", label: "Buscar", icon: Search },
  { key: "pending", label: "Pendientes", icon: BookmarkPlus },
  { key: "ratings", label: "Notas", icon: Star }
] as const;

const monetizationLabels: Record<MonetizationType, string> = {
  included: "Incluido",
  rent: "Alquiler",
  buy: "Compra"
};

const watchStatusLabels: Record<WatchStatus, string> = {
  none: "Pendiente",
  watching: "Viendo",
  watched: "Vista",
  abandoned: "Abandonada"
};

export function CineApp({ currentProfile, accessToken }: { currentProfile?: ProfileKey; accessToken?: string }) {
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [previewProfile, setPreviewProfile] = useState<ProfileKey>("RR");
  const activeProfile = currentProfile ?? previewProfile;
  const [titles, setTitles] = useState<CineTitle[]>(demoTitles);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedTitleId, setSelectedTitleId] = useState<string>(demoTitles[0]?.id ?? "");
  const [detailTitle, setDetailTitle] = useState<CineTitle | null>(null);

  const loadCatalog = async () => {
    if (!accessToken) return;
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const response = await fetch("/api/cine/catalog", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar el catalogo.");
      const nextTitles = (payload.titles ?? []) as CineTitle[];
      setTitles(nextTitles);
      setSelectedTitleId((current) => (nextTitles.some((title) => title.id === current) ? current : nextTitles[0]?.id ?? ""));
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "No se pudo cargar el catalogo.");
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    // Load the real catalog once the access token is available (fetch-on-mount).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCatalog();
  }, [accessToken]);

  const selectedTitle = titles.find((title) => title.id === selectedTitleId) ?? titles[0];

  const filteredTitles = useMemo(() => {
    return titles
      .filter((title) => {
        const query = normalizeText(filters.query.trim());
        const searchable = normalizeText([title.title, title.originalTitle, ...(title.searchTitles ?? []), ...title.genres].filter(Boolean).join(" "));
        if (query && !searchable.includes(query)) return false;
        if (filters.kind !== "all" && title.kind !== filters.kind) return false;
        if (filters.providers.length && !filters.providers.some((provider) => title.availability.some((item) => item.provider === provider))) {
          return false;
        }
        if (filters.monetization !== "all" && !title.availability.some((item) => item.type === filters.monetization)) {
          return false;
        }
        if (filters.minScore > 0) {
          const score = scoreForSource(title, filters.ratingSource);
          if (score === undefined || score < filters.minScore) return false;
        }
        if (!passesWatchFilter(title, filters.watch, activeProfile)) return false;
        return true;
      })
      .sort((left, right) => sortTitles(left, right, filters.sort));
  }, [filters, titles, activeProfile]);

  const pendingTitles = titles.filter((title) => title.pendingCategories.length > 0);
  const watchedTogether = titles.filter(
    (title) => title.personal.RR.status === "watched" && title.personal.LB.status === "watched"
  );
  const bestShared = watchedTogether
    .map((title) => ({
      title,
      average: ((title.personal.RR.rating ?? 0) + (title.personal.LB.rating ?? 0)) / 2
    }))
    .sort((left, right) => right.average - left.average);

  const persistState = async (title: CineTitle, state: { status?: WatchStatus; rating?: number | null; scope?: "me" | "both" }) => {
    if (!accessToken || !title.tmdbId) return;
    try {
      const response = await fetch("/api/cine/state", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          tmdbId: title.tmdbId,
          mediaType: title.kind,
          ...state,
        }),
      });
      // The list updates optimistically; on failure re-sync from the server so the
      // UI never keeps a change that was not persisted.
      if (!response.ok) {
        setCatalogError("No se pudo guardar el cambio. Recargando estado real.");
        await loadCatalog();
      }
    } catch {
      setCatalogError("Sin conexion al guardar. Recargando estado real.");
      await loadCatalog();
    }
  };

  const syncCatalog = async () => {
    if (!accessToken || syncLoading) return;
    setSyncLoading(true);
    setCatalogError("");
    setSyncMessage("Actualizando catalogo...");
    try {
      const response = await fetch("/api/cine/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "No se pudo actualizar el catalogo.");
      const ratings = payload.ratings;
      const ratingsText = ratings && !ratings.skipped ? ` Notas externas: ${ratings.updated ?? 0}/${ratings.attempted ?? 0}.` : "";
      setSyncMessage(`Catalogo actualizado: ${payload.titles ?? 0} titulos importados.${ratingsText}`);
      await loadCatalog();
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "No se pudo actualizar el catalogo.");
      setSyncMessage("");
    } finally {
      setSyncLoading(false);
    }
  };

  const updatePendingCategory = async (titleId: string, category: PendingCategory, action: "add" | "remove") => {
    const currentTitle = titles.find((title) => title.id === titleId);
    if (!accessToken || !currentTitle?.tmdbId) return;

    setTitles((current) =>
      current.map((title) => {
        if (title.id !== titleId) return title;
        const categories = action === "add"
          ? [...new Set([...title.pendingCategories, category])]
          : title.pendingCategories.filter((item) => item !== category);
        return { ...title, pendingCategories: categories };
      })
    );

    const response = await fetch("/api/cine/pending", {
      method: action === "add" ? "POST" : "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        tmdbId: currentTitle.tmdbId,
        mediaType: currentTitle.kind,
        category,
      }),
    });
    if (!response.ok) await loadCatalog();
  };
  const updateRating = (titleId: string, profile: ProfileKey, rating: number | null) => {
    const currentTitle = titles.find((title) => title.id === titleId);
    if (currentTitle && profile === activeProfile) {
      void persistState(currentTitle, { rating, status: currentTitle.personal[profile].status === "none" ? "watched" : currentTitle.personal[profile].status });
    }
    setTitles((current) =>
      current.map((title) =>
        title.id === titleId
          ? {
              ...title,
              personal: {
                ...title.personal,
                [profile]: {
                  ...title.personal[profile],
                  rating,
                  status: title.personal[profile].status === "none" ? "watched" : title.personal[profile].status
                }
              }
            }
          : title
      )
    );
  };

  const markWatched = (titleId: string, scope: "me" | "both") => {
    const today = new Date().toISOString().slice(0, 10);
    const currentTitle = titles.find((title) => title.id === titleId);
    if (currentTitle) void persistState(currentTitle, { status: "watched", scope });
    setTitles((current) =>
      current.map((title) => {
        if (title.id !== titleId) return title;
        const nextPersonal = {
          ...title.personal,
          [activeProfile]: {
            ...title.personal[activeProfile],
            status: "watched" as const,
            watchedAt: today
          }
        };
        if (scope === "both") {
          nextPersonal.RR = { ...nextPersonal.RR, status: "watched", watchedAt: today };
          nextPersonal.LB = { ...nextPersonal.LB, status: "watched", watchedAt: today };
        }
        return { ...title, personal: nextPersonal };
      })
    );
  };

  return (
    <main className="cine-app-shell min-h-screen bg-[var(--page-bg)] text-[var(--text-main)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[520px] flex-col border-x border-white/8 bg-[var(--app-bg)] shadow-2xl shadow-black/40">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(10,8,9,0.88)] px-4 pb-3 pt-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[linear-gradient(145deg,#f5b84b,#9e1b32)] text-black">
                <Clapperboard size={22} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">PWA privada</p>
                <h1 className="truncate text-2xl font-semibold leading-tight">Cine</h1>
              </div>
            </div>
            <div className="flex rounded-full border border-white/10 bg-white/6 p-1">
              <button type="button" onClick={syncCatalog} disabled={syncLoading} className="h-9 w-9 rounded-full text-[var(--text-soft)] transition hover:bg-white/10 disabled:opacity-50" aria-label="Actualizar catalogo">
                <RefreshCw size={17} className={syncLoading ? "animate-spin" : ""} />
              </button>
              {profiles.map((profile) => (
                <button
                  key={profile.key}
                  type="button"
                  aria-pressed={activeProfile === profile.key}
                  onClick={() => { if (!currentProfile) setPreviewProfile(profile.key); }}
                  disabled={Boolean(currentProfile)} aria-label={currentProfile ? `Usuario activo ${profile.key}` : `Cambiar a ${profile.key}`} className={`h-9 w-9 rounded-full text-sm font-bold transition ${
                    activeProfile === profile.key
                      ? "bg-[var(--gold)] text-black"
                      : currentProfile ? "text-[var(--muted)] opacity-45" : "text-[var(--text-soft)] hover:bg-white/10"
                  }`}
                >
                  {profile.key}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="flex-1 px-4 pb-28 pt-4">
          {catalogLoading && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/6 p-3 text-sm text-[var(--text-soft)]">
              Cargando catalogo real de plataformas...
            </div>
          )}
          {syncMessage && (
            <div className="mb-4 rounded-xl border border-white/10 bg-white/6 p-3 text-sm text-[var(--text-soft)]">
              {syncMessage}
            </div>
          )}
          {catalogError && (
            <div className="mb-4 rounded-xl border border-red-400/20 bg-red-500/12 p-3 text-sm text-red-100">
              {catalogError}
            </div>
          )}
          {activeTab === "home" && (
            <HomeView
              titles={titles}
              selectedTitle={selectedTitle}
              bestShared={bestShared}
              setSelectedTitleId={setSelectedTitleId}
              setActiveTab={setActiveTab}
              markWatched={markWatched}
              updateRating={updateRating}
              activeProfile={activeProfile}
              updatePendingCategory={updatePendingCategory}
              openDetail={setDetailTitle}
            />
          )}
          {activeTab === "explore" && (
            <ExploreView
              titles={filteredTitles}
              filters={filters}
              setFilters={setFilters}
              setSelectedTitleId={setSelectedTitleId}
              updateRating={updateRating}
              markWatched={markWatched}
              activeProfile={activeProfile}
              updatePendingCategory={updatePendingCategory}
              openDetail={setDetailTitle}
            />
          )}
          {activeTab === "pending" && (
            <PendingView
              titles={pendingTitles}
              setSelectedTitleId={setSelectedTitleId}
              setActiveTab={setActiveTab}
            />
          )}
          {activeTab === "ratings" && <RatingsView titles={titles} />}
          <p className="mt-6 text-center text-[10px] leading-4 text-[var(--muted)]">
            Datos e imagenes de TMDB. Disponibilidad de streaming via TMDB/JustWatch.
          </p>
        </section>

        <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[520px] -translate-x-1/2 border-t border-white/10 bg-[rgba(10,8,9,0.92)] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-xl">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`grid h-14 place-items-center rounded-xl text-[11px] font-semibold transition ${
                    isActive ? "bg-white/12 text-[var(--gold)]" : "text-[var(--muted)] hover:bg-white/8"
                  }`}
                >
                  <Icon size={21} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
      {detailTitle && (
        <TitleDetailSheet
          title={detailTitle}
          accessToken={accessToken}
          activeProfile={activeProfile}
          onClose={() => setDetailTitle(null)}
          markWatched={markWatched}
          updateRating={updateRating}
          updatePendingCategory={updatePendingCategory}
        />
      )}
    </main>
  );
}

function HomeView({
  titles,
  selectedTitle,
  bestShared,
  setSelectedTitleId,
  setActiveTab,
  markWatched,
  updateRating,
  activeProfile,
  updatePendingCategory,
  openDetail
}: {
  titles: CineTitle[];
  selectedTitle: CineTitle;
  bestShared: Array<{ title: CineTitle; average: number }>;
  setSelectedTitleId: (id: string) => void;
  setActiveTab: (tab: TabKey) => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  updateRating: (titleId: string, profile: ProfileKey, rating: number | null) => void;
  activeProfile: ProfileKey;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
  openDetail: (title: CineTitle) => void;
}) {
  const unwatchedTogether = titles.filter(
    (title) => title.personal.RR.status !== "watched" && title.personal.LB.status !== "watched"
  );

  return (
    <div className="space-y-5">
      <HeroTitle
        title={selectedTitle}
        activeProfile={activeProfile}
        markWatched={markWatched}
        updateRating={updateRating}
        updatePendingCategory={updatePendingCategory}
        openDetail={openDetail}
      />

      <div className="grid grid-cols-3 gap-2">
        <Metric icon={BookmarkPlus} label="Pendientes" value={unwatchedTogether.length.toString()} />
        <Metric icon={Users} label="Vistas juntos" value={bestShared.length.toString()} />
        <Metric icon={Trophy} label="Top media" value={bestShared[0] ? bestShared[0].average.toFixed(1) : "-"} />
      </div>

      <SectionHeader
        icon={Sparkles}
        title="Para decidir hoy"
        action="Buscar"
        onAction={() => setActiveTab("explore")}
      />
      <HorizontalShelf titles={unwatchedTogether} setSelectedTitleId={setSelectedTitleId} />

      <SectionHeader icon={Trophy} title="Mejor valoradas por vosotros" />
      <div className="space-y-2">
        {bestShared.slice(0, 4).map(({ title, average }) => (
          <button
            key={title.id}
            type="button"
            onClick={() => setSelectedTitleId(title.id)}
            className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/6 p-3 text-left"
          >
            <Poster title={title} size="small" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{title.title}</p>
              <p className="truncate text-sm text-[var(--muted)]">{title.genres.join(" / ")}</p>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold)] text-sm font-black text-black">
              {average.toFixed(1)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ExploreView({
  titles,
  filters,
  setFilters,
  setSelectedTitleId,
  updateRating,
  markWatched,
  activeProfile,
  updatePendingCategory,
  openDetail
}: {
  titles: CineTitle[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setSelectedTitleId: (id: string) => void;
  updateRating: (titleId: string, profile: ProfileKey, rating: number | null) => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  activeProfile: ProfileKey;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
  openDetail: (title: CineTitle) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/6 p-3">
        <label className="flex h-11 items-center gap-2 rounded-xl bg-black/24 px-3">
          <Search size={18} className="text-[var(--muted)]" />
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="Buscar pelicula o serie"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted)]"
          />
        </label>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <FilterChip active={filters.kind === "all"} onClick={() => setFilters((current) => ({ ...current, kind: "all" }))}>
            Todo
          </FilterChip>
          <FilterChip
            active={filters.kind === "movie"}
            onClick={() => setFilters((current) => ({ ...current, kind: "movie" }))}
          >
            Pelis
          </FilterChip>
          <FilterChip
            active={filters.kind === "series"}
            onClick={() => setFilters((current) => ({ ...current, kind: "series" }))}
          >
            Series
          </FilterChip>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(Object.keys(watchFilterLabels) as WatchFilter[]).map((key) => (
            <FilterChip
              key={key}
              active={filters.watch === key}
              onClick={() => setFilters((current) => ({ ...current, watch: key }))}
            >
              {watchFilterLabels[key]}
            </FilterChip>
          ))}
        </div>
        <div className="space-y-2 rounded-xl bg-black/24 p-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
            <Ticket size={15} />
            Plataformas
          </div>
          <div className="flex flex-wrap gap-1.5">
            {providers.map((provider) => (
              <FilterChip
                key={provider.key}
                active={filters.providers.includes(provider.key)}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    providers: current.providers.includes(provider.key)
                      ? current.providers.filter((item) => item !== provider.key)
                      : [...current.providers, provider.key],
                  }))
                }
              >
                {provider.shortName}
              </FilterChip>
            ))}
            {filters.providers.length > 0 && (
              <FilterChip active={false} onClick={() => setFilters((current) => ({ ...current, providers: [] }))}>
                Limpiar
              </FilterChip>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            icon={SlidersHorizontal}
            value={filters.monetization}
            onChange={(value) => setFilters((current) => ({ ...current, monetization: value as Filters["monetization"] }))}
          >
            <option value="all">Incluido / pago</option>
            <option value="included">Incluido</option>
            <option value="rent">Alquiler</option>
            <option value="buy">Compra</option>
          </SelectField>
          <SelectField
            icon={Trophy}
            value={filters.sort}
            onChange={(value) => setFilters((current) => ({ ...current, sort: value as SortKey }))}
          >
            <option value="top_rated">Mejor nota</option>
            <option value="popular">Populares</option>
            <option value="recent">Mas nuevas</option>
          </SelectField>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            icon={Star}
            value={filters.ratingSource}
            onChange={(value) => setFilters((current) => ({ ...current, ratingSource: value as RatingSource }))}
          >
            <option value="tmdb">Nota TMDB</option>
            <option value="imdb">Nota IMDb</option>
            <option value="rt">Rotten Tomatoes</option>
            <option value="metacritic">Metacritic</option>
          </SelectField>
          <label className="block rounded-xl bg-black/24 px-3 py-2">
            <span className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
              Nota min <strong className="text-[var(--text-main)]">{formatMinScore(filters)}</strong>
            </span>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={filters.minScore}
              onChange={(event) => setFilters((current) => ({ ...current, minScore: Number(event.target.value) }))}
              className="w-full accent-[var(--gold)]"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        {titles.map((title) => (
          <TitleCard
            key={title.id}
            title={title}
            onSelect={() => setSelectedTitleId(title.id)}
            activeProfile={activeProfile}
            updateRating={updateRating}
            markWatched={markWatched}
            updatePendingCategory={updatePendingCategory}
            openDetail={openDetail}
          />
        ))}
      </div>
    </div>
  );
}

function PendingView({
  titles,
  setSelectedTitleId,
  setActiveTab
}: {
  titles: CineTitle[];
  setSelectedTitleId: (id: string) => void;
  setActiveTab: (tab: TabKey) => void;
}) {
  return (
    <div className="space-y-5">
      <SectionHeader icon={BookmarkPlus} title="Pendientes" />
      {pendingCategories.map((category) => {
        const categoryTitles = titles.filter((title) => title.pendingCategories.includes(category));
        if (categoryTitles.length === 0) return null;
        return (
          <section key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{category}</h2>
              <span className="rounded-full bg-white/8 px-2 py-1 text-xs text-[var(--muted)]">
                {categoryTitles.length}
              </span>
            </div>
            <HorizontalShelf
              titles={categoryTitles}
              setSelectedTitleId={(id) => {
                setSelectedTitleId(id);
                setActiveTab("home");
              }}
            />
          </section>
        );
      })}
    </div>
  );
}

function RatingsView({ titles }: { titles: CineTitle[] }) {
  const rated = titles
    .filter((title) => title.personal.RR.rating || title.personal.LB.rating)
    .map((title) => ({
      title,
      rr: title.personal.RR.rating,
      lb: title.personal.LB.rating,
      gap: Math.abs((title.personal.RR.rating ?? 0) - (title.personal.LB.rating ?? 0))
    }))
    .sort((left, right) => ((right.rr ?? 0) + (right.lb ?? 0)) / 2 - ((left.rr ?? 0) + (left.lb ?? 0)) / 2);

  return (
    <div className="space-y-4">
      <SectionHeader icon={Star} title="Notas RR/LB" />
      <div className="grid grid-cols-2 gap-2">
        <ScorePanel label="Top RR" value={topScore(titles, "RR")} />
        <ScorePanel label="Top LB" value={topScore(titles, "LB")} />
      </div>
      <div className="space-y-2">
        {rated.map(({ title, rr, lb, gap }) => (
          <div key={title.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/6 p-3">
            <Poster title={title} size="small" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{title.title}</p>
              <p className="text-sm text-[var(--muted)]">Diferencia: {gap}</p>
            </div>
            <div className="grid grid-cols-2 gap-1 text-center">
              <MiniScore label="RR" value={rr} />
              <MiniScore label="LB" value={lb} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroTitle({
  title,
  activeProfile,
  markWatched,
  updateRating,
  updatePendingCategory,
  openDetail
}: {
  title: CineTitle;
  activeProfile: ProfileKey;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  updateRating: (titleId: string, profile: ProfileKey, rating: number | null) => void;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
  openDetail: (title: CineTitle) => void;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-white/10 bg-white/7 shadow-xl shadow-black/25">
      <div
        className="min-h-[310px] bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8,7,7,0.18), rgba(8,7,7,0.92) 72%), url(https://image.tmdb.org/t/p/w780${title.backdropPath})`
        }}
      >
        <div className="flex min-h-[310px] flex-col justify-end p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge icon={title.kind === "movie" ? Film : Tv}>{title.kind === "movie" ? "Pelicula" : "Serie"}</Badge>
            {title.availability.map((item) => (
              <ProviderBadge key={`${item.provider}-${item.type}`} provider={item.provider} type={item.type} />
            ))}
          </div>
          <h2 className="text-3xl font-semibold leading-tight">{title.title}</h2>
          {title.originalTitle && title.originalTitle !== title.title && <p className="mt-1 text-sm font-semibold text-[var(--gold)]">{title.originalTitle}</p>}
          <p className="mt-1 text-sm text-[var(--text-soft)]">{formatTitleMeta(title)}</p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-soft)]">{title.overview}</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <button
          type="button"
          onClick={() => openDetail(title)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/8 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition hover:bg-white/14"
        >
          <Info size={17} />
          Ver ficha completa
        </button>
        <RatingStrip title={title} />
        <WatchStatusStrip title={title} activeProfile={activeProfile} />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => markWatched(title.id, "me")}
            className={`action-button ${title.personal[activeProfile].status === "watched" ? "action-button-done" : ""}`}
          >
            <Check size={18} />
            Vista por mi
          </button>
          <button
            type="button"
            onClick={() => markWatched(title.id, "both")}
            className={`action-button action-button-gold ${title.personal.RR.status === "watched" && title.personal.LB.status === "watched" ? "action-button-done" : ""}`}
          >
            <Users size={18} />
            Vista ambos
          </button>
        </div>
        <RatingPicker
          activeProfile={activeProfile}
          value={title.personal[activeProfile].rating}
          onChange={(rating) => updateRating(title.id, activeProfile, rating)}
        />
        <PendingCategoryControls title={title} updatePendingCategory={updatePendingCategory} />
      </div>
    </article>
  );
}

function TitleDetailSheet({
  title,
  accessToken,
  activeProfile,
  onClose,
  markWatched,
  updateRating,
  updatePendingCategory
}: {
  title: CineTitle;
  accessToken?: string;
  activeProfile: ProfileKey;
  onClose: () => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  updateRating: (titleId: string, profile: ProfileKey, rating: number | null) => void;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
}) {
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessToken || !title.tmdbId) return;
    const controller = new AbortController();
    async function loadDetail() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/cine/title/${title.tmdbId}?type=${title.kind}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar la ficha.");
        setDetail(payload.detail as TitleDetail);
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "No se pudo cargar la ficha.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadDetail();
    return () => controller.abort();
  }, [accessToken, title.tmdbId, title.kind]);

  const runtime = detail?.runtimeMinutes ?? title.runtimeMinutes;
  const overview = detail?.overview || title.overview;
  const detailProviders = detail?.flatrateProviders.length ? detail.flatrateProviders : title.availability.map((item) => item.provider);

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <button type="button" aria-label="Cerrar ficha" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 mt-auto flex max-h-[92vh] w-full max-w-[520px] flex-col overflow-y-auto rounded-t-3xl border border-white/10 bg-[var(--app-bg)] pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl shadow-black/60">
        <div
          className="min-h-[220px] bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(8,7,7,0.2), rgba(8,7,7,0.94) 78%), url(https://image.tmdb.org/t/p/w780${title.backdropPath || title.posterPath})` }}
        >
          <div className="flex items-start justify-between p-3">
            <span className="h-1.5 w-12 rounded-full bg-white/25" />
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
          <div className="px-4 pb-4 pt-16">
            <h2 className="text-2xl font-semibold leading-tight">{title.title}</h2>
            {title.originalTitle && title.originalTitle !== title.title && (
              <p className="mt-1 text-sm font-semibold text-[var(--gold)]">{title.originalTitle}</p>
            )}
            <p className="mt-1 text-sm text-[var(--text-soft)]">
              {[title.year || null, runtime ? formatRuntime(runtime) : null, (detail?.genres ?? title.genres).slice(0, 3).join(" / ") || null].filter(Boolean).join(" - ")}
            </p>
            {detail?.tagline && <p className="mt-2 text-sm italic text-[var(--muted)]">{detail.tagline}</p>}
          </div>
        </div>

        <div className="space-y-4 p-4">
          <RatingStrip title={title} />

          {detail?.trailerKey && (
            <a
              href={`https://www.youtube.com/watch?v=${detail.trailerKey}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] py-3 text-sm font-bold text-black"
            >
              <Play size={18} />
              Ver trailer
            </a>
          )}

          {overview && <p className="text-sm leading-6 text-[var(--text-soft)]">{overview}</p>}

          {detailProviders.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Disponible en</p>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(detailProviders)].map((provider) => {
                  const data = providers.find((item) => item.key === provider);
                  return (
                    <span key={provider} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/34 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-soft)]">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: data?.accent ?? "var(--gold)" }} />
                      {data?.name ?? provider}
                    </span>
                  );
                })}
                {detail?.justwatchLink && (
                  <a href={detail.justwatchLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/8 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-soft)]">
                    Donde ver <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          )}

          {detail && detail.directors.length > 0 && (
            <p className="text-sm text-[var(--text-soft)]">
              <span className="text-[var(--muted)]">{title.kind === "movie" ? "Direccion: " : "Creado por: "}</span>
              {detail.directors.join(", ")}
            </p>
          )}

          {detail && detail.cast.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Reparto</p>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
                {detail.cast.map((person) => (
                  <div key={`${person.name}-${person.character ?? ""}`} className="w-[84px] shrink-0 text-center">
                    <div
                      className="mx-auto h-[110px] w-[84px] overflow-hidden rounded-xl bg-white/6 bg-cover bg-center"
                      style={person.profilePath ? { backgroundImage: `url(https://image.tmdb.org/t/p/w185${person.profilePath})` } : undefined}
                    />
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4">{person.name}</p>
                    {person.character && <p className="line-clamp-1 text-[10px] text-[var(--muted)]">{person.character}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading && <p className="text-sm text-[var(--muted)]">Cargando ficha...</p>}
          {error && <p className="rounded-xl bg-red-500/12 p-3 text-sm text-red-200">{error}</p>}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => markWatched(title.id, "me")}
              className={`action-button ${title.personal[activeProfile].status === "watched" ? "action-button-done" : ""}`}
            >
              <Check size={18} />
              Vista por mi
            </button>
            <button
              type="button"
              onClick={() => markWatched(title.id, "both")}
              className={`action-button action-button-gold ${title.personal.RR.status === "watched" && title.personal.LB.status === "watched" ? "action-button-done" : ""}`}
            >
              <Users size={18} />
              Vista ambos
            </button>
          </div>
          <RatingPicker
            activeProfile={activeProfile}
            value={title.personal[activeProfile].rating}
            onChange={(rating) => updateRating(title.id, activeProfile, rating)}
          />
          <PendingCategoryControls title={title} updatePendingCategory={updatePendingCategory} />
        </div>
      </div>
    </div>
  );
}

function TitleCard({
  title,
  onSelect,
  activeProfile,
  updateRating,
  markWatched,
  updatePendingCategory,
  openDetail
}: {
  title: CineTitle;
  onSelect: () => void;
  activeProfile: ProfileKey;
  updateRating: (titleId: string, profile: ProfileKey, rating: number | null) => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
  openDetail: (title: CineTitle) => void;
}) {
  return (
    <article className="rounded-2xl border border-white/8 bg-white/6 p-3">
      <button type="button" onClick={onSelect} className="flex w-full gap-3 text-left">
        <Poster title={title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">{title.title}</h3>
              {title.originalTitle && title.originalTitle !== title.title && <p className="truncate text-xs font-semibold text-[var(--gold)]">{title.originalTitle}</p>}
              <p className="truncate text-sm text-[var(--muted)]">{formatTitleMeta(title, true)}</p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/35 text-sm font-bold">
              {(title.imdbRating ?? title.tmdbRating)?.toFixed(1) ?? "-"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {title.availability.map((item) => (
              <ProviderBadge key={`${title.id}-${item.provider}-${item.type}`} provider={item.provider} type={item.type} compact />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <MiniScore label="RR" value={title.personal.RR.rating} />
            <MiniScore label="LB" value={title.personal.LB.rating} />
          </div>
        </div>
      </button>
      <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] gap-2">
        <RatingPicker
          activeProfile={activeProfile}
          value={title.personal[activeProfile].rating}
          onChange={(rating) => updateRating(title.id, activeProfile, rating)}
          compact
        />
        <button type="button" onClick={() => openDetail(title)} className="icon-action" aria-label="Ver ficha">
          <Info size={18} />
        </button>
        <button type="button" onClick={() => updatePendingCategory(title.id, "Para ver juntos", title.pendingCategories.includes("Para ver juntos") ? "remove" : "add")} className={`icon-action ${title.pendingCategories.includes("Para ver juntos") ? "action-button-done" : ""}`} aria-label="Pendiente para ver juntos">
          <BookmarkPlus size={18} />
        </button>
        <button type="button" onClick={() => markWatched(title.id, "both")} className="icon-action" aria-label="Vista por ambos">
          <Users size={18} />
        </button>
      </div>
    </article>
  );
}

function HorizontalShelf({
  titles,
  setSelectedTitleId
}: {
  titles: CineTitle[];
  setSelectedTitleId: (id: string) => void;
}) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {titles.map((title) => (
        <button
          key={title.id}
          type="button"
          onClick={() => setSelectedTitleId(title.id)}
          className="w-[132px] shrink-0 text-left"
        >
          <Poster title={title} size="shelf" />
          <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{title.title}</p>
          <p className="text-xs text-[var(--muted)]">TMDB {title.tmdbRating?.toFixed(1) ?? "-"}</p>
        </button>
      ))}
    </div>
  );
}

function Poster({ title, size = "normal" }: { title: CineTitle; size?: "small" | "normal" | "shelf" }) {
  const classes = {
    small: "h-16 w-11",
    normal: "h-32 w-22",
    shelf: "h-[190px] w-[132px]"
  };
  return (
    <div
      className={`${classes[size]} shrink-0 overflow-hidden rounded-xl bg-cover bg-center shadow-lg shadow-black/35`}
      style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w342${title.posterPath})` }}
      aria-label={title.title}
    />
  );
}

function WatchStatusStrip({
  title,
  activeProfile,
  compact = false
}: {
  title: CineTitle;
  activeProfile?: ProfileKey;
  compact?: boolean;
}) {
  const bothWatched = title.personal.RR.status === "watched" && title.personal.LB.status === "watched";
  const activeWatched = activeProfile ? title.personal[activeProfile].status === "watched" : false;
  const summary = bothWatched
    ? "Vista por ambos"
    : activeWatched && activeProfile
      ? `Vista por ${activeProfile}`
      : "Pendiente por alguno";

  return (
    <div className={`${compact ? "mt-2" : ""} rounded-xl border border-white/8 bg-black/24 p-2`}>
      {!compact && <p className="mb-2 text-xs font-semibold text-[var(--gold)]">{summary}</p>}
      <div className="grid grid-cols-2 gap-2">
        <StatusPill label="RR" status={title.personal.RR.status} watchedAt={title.personal.RR.watchedAt} />
        <StatusPill label="LB" status={title.personal.LB.status} watchedAt={title.personal.LB.watchedAt} />
      </div>
    </div>
  );
}

function StatusPill({ label, status, watchedAt }: { label: ProfileKey; status: WatchStatus; watchedAt?: string }) {
  const isWatched = status === "watched";
  return (
    <div className={`rounded-lg px-2 py-1.5 ${isWatched ? "bg-[rgba(68,209,157,0.16)] text-[#92f0c9]" : "bg-white/6 text-[var(--muted)]"}`}>
      <p className="text-[10px] font-black">{label}</p>
      <p className="text-xs font-semibold">{watchStatusLabels[status]}</p>
      {watchedAt && <p className="text-[10px] opacity-75">{watchedAt}</p>}
    </div>
  );
}
function RatingStrip({ title }: { title: CineTitle }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Metric label="TMDB" value={title.tmdbRating?.toFixed(1) ?? "-"} />
      <Metric label="IMDb" value={title.imdbRating?.toFixed(1) ?? "-"} />
      <Metric label="RT" value={title.rtTomatometer != null ? `${title.rtTomatometer}%` : "-"} />
      <Metric label="Metacritic" value={title.metascore != null ? `${title.metascore}` : "-"} />
    </div>
  );
}

function PendingCategoryControls({
  title,
  updatePendingCategory
}: {
  title: CineTitle;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
}) {
  const [category, setCategory] = useState<PendingCategory>("Para ver juntos");
  const canAdd = !title.pendingCategories.includes(category);

  return (
    <div className="rounded-xl bg-black/24 p-2">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="flex h-10 min-w-0 items-center gap-2 rounded-lg bg-white/6 px-2 text-sm">
          <BookmarkPlus size={15} className="shrink-0 text-[var(--muted)]" />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as PendingCategory)}
            className="min-w-0 flex-1 bg-transparent text-[var(--text-soft)] outline-none"
          >
            {pendingCategories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => updatePendingCategory(title.id, category, "add")}
          disabled={!canAdd}
          className="h-10 rounded-lg bg-white/8 px-3 text-xs font-semibold text-[var(--text-soft)] transition hover:bg-white/14 disabled:opacity-45"
        >
          Anadir
        </button>
      </div>
      {title.pendingCategories.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {title.pendingCategories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => updatePendingCategory(title.id, item, "remove")}
              className="inline-flex items-center gap-1 rounded-full bg-white/8 px-2 py-1 text-[11px] font-semibold text-[var(--text-soft)]"
            >
              {item}
              <X size={12} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function RatingPicker({
  activeProfile,
  value,
  onChange,
  compact = false
}: {
  activeProfile: ProfileKey;
  value?: number;
  onChange: (rating: number | null) => void;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-xl bg-black/24 p-2 ${compact ? "" : "space-y-2"}`}>
      {!compact && (
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Nota de {activeProfile}</span>
          <strong className="text-[var(--text-main)]">{value ? `${value}/10` : "Sin nota"}</strong>
        </div>
      )}
      <div className="grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(value === rating ? null : rating)}
            aria-label={value === rating ? `Quitar ${rating}` : `Poner ${rating}`}
            className={`h-8 rounded-md text-xs font-bold transition ${
              value === rating ? "bg-[var(--gold)] text-black" : "bg-white/8 text-[var(--text-soft)] hover:bg-white/14"
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProviderBadge({
  provider,
  type,
  compact = false
}: {
  provider: ProviderKey;
  type: MonetizationType;
  compact?: boolean;
}) {
  const providerData = providers.find((item) => item.key === provider);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/34 ${
        compact ? "px-2 py-1 text-[10px]" : "px-2.5 py-1.5 text-xs"
      } font-semibold text-[var(--text-soft)]`}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: providerData?.accent ?? "var(--gold)" }}
      />
      {providerData?.shortName ?? provider}
      <span className="text-[var(--muted)]">{monetizationLabels[type]}</span>
    </span>
  );
}

function Badge({ icon: Icon, children }: { icon: typeof Film; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/34 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-soft)]">
      <Icon size={13} />
      {children}
    </span>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon?: typeof Home;
  label: string;
  value: string;
}) {
  return (
    <div className="min-h-20 rounded-xl border border-white/8 bg-white/6 p-3">
      <div className="mb-2 flex h-5 items-center gap-1.5 text-xs text-[var(--muted)]">
        {Icon && <Icon size={14} />}
        <span className="truncate">{label}</span>
      </div>
      <p className="text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
  onAction
}: {
  icon: typeof Home;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 text-xl font-semibold">
        <Icon size={20} className="text-[var(--gold)]" />
        <span className="truncate">{title}</span>
      </h2>
      {action && (
        <button type="button" onClick={onAction} className="rounded-full bg-white/8 px-3 py-1.5 text-xs font-semibold">
          {action}
        </button>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full px-3 text-sm font-semibold transition ${
        active ? "bg-[var(--gold)] text-black" : "bg-white/8 text-[var(--text-soft)] hover:bg-white/14"
      }`}
    >
      {children}
    </button>
  );
}

function SelectField({
  icon: Icon,
  value,
  onChange,
  children
}: {
  icon: typeof Home;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl bg-black/24 px-3 text-sm">
      <Icon size={16} className="shrink-0 text-[var(--muted)]" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[var(--text-soft)] outline-none"
      >
        {children}
      </select>
    </label>
  );
}

function ScorePanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/6 p-4">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function MiniScore({ label, value }: { label: string; value?: number }) {
  return (
    <div className="min-w-11 rounded-lg bg-black/24 px-2 py-1">
      <p className="text-[10px] font-bold text-[var(--muted)]">{label}</p>
      <p className="text-sm font-black">{value ? value : "-"}</p>
    </div>
  );
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sortTitles(left: CineTitle, right: CineTitle, sort: SortKey) {
  if (sort === "popular") return right.tmdbPopularity - left.tmdbPopularity;
  if (sort === "recent") return (right.year || 0) - (left.year || 0);
  return (right.imdbRating ?? 0) - (left.imdbRating ?? 0) || right.tmdbPopularity - left.tmdbPopularity;
}

function formatTitleMeta(title: CineTitle, compact = false) {
  const runtime = title.runtimeMinutes
    ? formatRuntime(title.runtimeMinutes)
    : title.kind === "movie"
      ? "Pelicula"
      : "Serie";
  const parts = [title.year || null, runtime, compact ? null : title.genres.slice(0, 2).join(" / ")].filter(Boolean);
  return parts.join(" - ");
}

function formatRuntime(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

// Normalises every rating source to a 0-10 scale so one slider can filter any of them.
function scoreForSource(title: CineTitle, source: RatingSource): number | undefined {
  if (source === "tmdb") return title.tmdbRating;
  if (source === "imdb") return title.imdbRating;
  if (source === "rt") return title.rtTomatometer != null ? title.rtTomatometer / 10 : undefined;
  return title.metascore != null ? title.metascore / 10 : undefined;
}

function passesWatchFilter(title: CineTitle, watch: WatchFilter, activeProfile: ProfileKey): boolean {
  if (watch === "all") return true;
  if (watch === "unseen_together") {
    return title.personal.RR.status !== "watched" && title.personal.LB.status !== "watched";
  }
  if (watch === "watched_rr") return title.personal.RR.status === "watched";
  if (watch === "watched_lb") return title.personal.LB.status === "watched";
  if (watch === "no_rating_mine") return !title.personal[activeProfile].rating;
  return title.pendingCategories.length > 0;
}

function formatMinScore(filters: Filters) {
  if (!filters.minScore) return "Cualquiera";
  return ratingSources[filters.ratingSource].unit === "percent"
    ? `${filters.minScore * 10}%`
    : `${filters.minScore}`;
}

function topScore(titles: CineTitle[], profile: ProfileKey) {
  const title = [...titles]
    .filter((item) => item.personal[profile].rating)
    .sort((left, right) => (right.personal[profile].rating ?? 0) - (left.personal[profile].rating ?? 0))[0];

  if (!title) return "-";
  return `${title.personal[profile].rating}/10`;
}


