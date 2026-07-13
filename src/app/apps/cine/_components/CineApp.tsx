"use client";

import {
  BookmarkPlus,
  Check,
  Clapperboard,
  Film,
  Home,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
  Trophy,
  Tv,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { demoTitles, pendingCategories, profiles, providers } from "../_lib/cine-data";
import type { CineTitle, MediaKind, MonetizationType, ProfileKey, ProviderKey, WatchStatus } from "../_lib/types";

type TabKey = "home" | "explore" | "pending" | "ratings";

type Filters = {
  query: string;
  kind: "all" | MediaKind;
  provider: "all" | ProviderKey;
  monetization: "all" | MonetizationType;
  minImdb: number;
  onlyUnwatchedTogether: boolean;
};

const initialFilters: Filters = {
  query: "",
  kind: "all",
  provider: "all",
  monetization: "all",
  minImdb: 0,
  onlyUnwatchedTogether: false
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
  const [catalogError, setCatalogError] = useState("");
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedTitleId, setSelectedTitleId] = useState<string>(demoTitles[0]?.id ?? "");


  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;
    async function loadCatalog() {
      setCatalogLoading(true);
      setCatalogError("");
      try {
        const response = await fetch("/api/cine/catalog", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error ?? "No se pudo cargar el catalogo.");
        if (!cancelled) {
          setTitles(payload.titles ?? []);
          setSelectedTitleId(payload.titles?.[0]?.id ?? "");
        }
      } catch (error) {
        if (!cancelled) setCatalogError(error instanceof Error ? error.message : "No se pudo cargar el catalogo.");
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const selectedTitle = titles.find((title) => title.id === selectedTitleId) ?? titles[0];

  const filteredTitles = useMemo(() => {
    return titles
      .filter((title) => {
        const query = filters.query.trim().toLowerCase();
        if (query && !title.title.toLowerCase().includes(query)) return false;
        if (filters.kind !== "all" && title.kind !== filters.kind) return false;
        if (filters.provider !== "all" && !title.availability.some((item) => item.provider === filters.provider)) {
          return false;
        }
        if (filters.monetization !== "all" && !title.availability.some((item) => item.type === filters.monetization)) {
          return false;
        }
        if (title.imdbRating && title.imdbRating < filters.minImdb) return false;
        if (filters.onlyUnwatchedTogether) {
          return title.personal.RR.status !== "watched" && title.personal.LB.status !== "watched";
        }
        return true;
      })
      .sort((left, right) => (right.imdbRating ?? 0) - (left.imdbRating ?? 0));
  }, [filters, titles]);

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

  const persistState = async (title: CineTitle, state: { status?: WatchStatus; rating?: number; scope?: "me" | "both" }) => {
    if (!accessToken || !title.tmdbId) return;
    await fetch("/api/cine/state", {
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
  };

  const updateRating = (titleId: string, profile: ProfileKey, rating: number) => {
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
  activeProfile
}: {
  titles: CineTitle[];
  selectedTitle: CineTitle;
  bestShared: Array<{ title: CineTitle; average: number }>;
  setSelectedTitleId: (id: string) => void;
  setActiveTab: (tab: TabKey) => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  updateRating: (titleId: string, profile: ProfileKey, rating: number) => void;
  activeProfile: ProfileKey;
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
  activeProfile
}: {
  titles: CineTitle[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setSelectedTitleId: (id: string) => void;
  updateRating: (titleId: string, profile: ProfileKey, rating: number) => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  activeProfile: ProfileKey;
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
          <FilterChip
            active={filters.onlyUnwatchedTogether}
            onClick={() =>
              setFilters((current) => ({ ...current, onlyUnwatchedTogether: !current.onlyUnwatchedTogether }))
            }
          >
            No vistas
          </FilterChip>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            icon={Ticket}
            value={filters.provider}
            onChange={(value) => setFilters((current) => ({ ...current, provider: value as Filters["provider"] }))}
          >
            <option value="all">Todas las plataformas</option>
            {providers.map((provider) => (
              <option key={provider.key} value={provider.key}>
                {provider.name}
              </option>
            ))}
          </SelectField>
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
        </div>
        <label className="block rounded-xl bg-black/24 px-3 py-2">
          <span className="mb-2 flex items-center justify-between text-xs text-[var(--muted)]">
            IMDb minimo <strong className="text-[var(--text-main)]">{filters.minImdb || "Cualquiera"}</strong>
          </span>
          <input
            type="range"
            min="0"
            max="9"
            step="1"
            value={filters.minImdb}
            onChange={(event) => setFilters((current) => ({ ...current, minImdb: Number(event.target.value) }))}
            className="w-full accent-[var(--gold)]"
          />
        </label>
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
  updateRating
}: {
  title: CineTitle;
  activeProfile: ProfileKey;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  updateRating: (titleId: string, profile: ProfileKey, rating: number) => void;
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
          <p className="mt-1 text-sm text-[var(--text-soft)]">
            {title.year} · {title.runtimeLabel} · {title.genres.slice(0, 2).join(" / ")}
          </p>
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--text-soft)]">{title.overview}</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
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
      </div>
    </article>
  );
}

function TitleCard({
  title,
  onSelect,
  activeProfile,
  updateRating,
  markWatched
}: {
  title: CineTitle;
  onSelect: () => void;
  activeProfile: ProfileKey;
  updateRating: (titleId: string, profile: ProfileKey, rating: number) => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
}) {
  return (
    <article className="rounded-2xl border border-white/8 bg-white/6 p-3">
      <button type="button" onClick={onSelect} className="flex w-full gap-3 text-left">
        <Poster title={title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">{title.title}</h3>
              <p className="truncate text-sm text-[var(--muted)]">
                {title.year} · {title.runtimeLabel}
              </p>
            </div>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black/35 text-sm font-bold">
              {title.imdbRating?.toFixed(1) ?? "-"}
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
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <RatingPicker
          activeProfile={activeProfile}
          value={title.personal[activeProfile].rating}
          onChange={(rating) => updateRating(title.id, activeProfile, rating)}
          compact
        />
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
          <p className="text-xs text-[var(--muted)]">TMDB {title.imdbRating?.toFixed(1) ?? "-"}</p>
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
      <Metric label="TMDB" value={title.imdbRating?.toFixed(1) ?? "-"} />
      <Metric label="RT Critica" value={title.rtTomatometer ? `${title.rtTomatometer}%` : "-"} />
      <Metric label="Popcorn" value={title.rtPopcornmeter ? `${title.rtPopcornmeter}%` : "-"} />
      <Metric label="Popular" value={Math.round(title.tmdbPopularity).toString()} />
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
  onChange: (rating: number) => void;
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
            onClick={() => onChange(rating)}
            aria-label={`Poner ${rating}`}
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

function topScore(titles: CineTitle[], profile: ProfileKey) {
  const title = [...titles]
    .filter((item) => item.personal[profile].rating)
    .sort((left, right) => (right.personal[profile].rating ?? 0) - (left.personal[profile].rating ?? 0))[0];

  if (!title) return "-";
  return `${title.personal[profile].rating}/10`;
}


