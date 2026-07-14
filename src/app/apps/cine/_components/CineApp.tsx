"use client";

import {
  BookmarkPlus,
  Check,
  Clapperboard,
  CloudOff,
  Dices,
  ExternalLink,
  Film,
  Flame,
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
import { CINE_QUEUE_CHANGED, enqueueMutation, flushQueue, getPendingCount } from "../_lib/offline";
import type { CineTitle, MediaKind, MonetizationType, PendingCategory, ProfileKey, ProviderKey, TitleDetail, WatchStatus } from "../_lib/types";

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

type TabKey = "home" | "explore" | "today" | "pending" | "ratings";

type TodayScope = "me" | "both";

type SortKey = "top_rated" | "popular" | "recent";

type RatingSource = "tmdb" | "imdb" | "metacritic";

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
  metacritic: { label: "Metacritic", unit: "percent" }
};

const rottenTomatoesSearch = (title: CineTitle) =>
  `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title.title)}`;

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
  { key: "today", label: "Hoy", icon: Dices },
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
  const [ratingFor, setRatingFor] = useState<CineTitle | null>(null);
  const [trendingKeys, setTrendingKeys] = useState<string[]>([]);
  const [online, setOnline] = useState(true);
  const [pendingWrites, setPendingWrites] = useState(0);

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

  useEffect(() => {
    if (!accessToken) return;
    void (async () => {
      try {
        const response = await fetch("/api/cine/trending", { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!response.ok) return;
        const payload = await response.json();
        setTrendingKeys((payload.keys ?? []) as string[]);
      } catch {
        // Trending is a nice-to-have shelf; ignore failures.
      }
    })();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    // Replay any queued offline writes now and whenever the connection returns.
    const flush = async () => {
      if (isOffline()) return;
      const flushed = await flushQueue(accessToken);
      if (flushed > 0) await loadCatalog();
    };
    void flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    // PWA offline is on hold: we no longer register a service worker (a stale SW
    // cache was breaking hydration after deploys). We still track online status
    // and the offline write queue for user feedback.
    const refreshPending = () => setPendingWrites(getPendingCount());
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    refreshPending();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener(CINE_QUEUE_CHANGED, refreshPending);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener(CINE_QUEUE_CHANGED, refreshPending);
    };
  }, []);

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
    .map((title) => ({ title, average: coupleRating(title) ?? 0 }))
    .filter((item) => item.average > 0)
    .sort((left, right) => right.average - left.average);

  const persistState = async (title: CineTitle, state: { status?: WatchStatus; rating?: number | null; scope?: "me" | "both" }) => {
    if (!accessToken || !title.tmdbId) return;
    const body = { tmdbId: title.tmdbId, mediaType: title.kind, ...state };

    // Offline: keep the optimistic change and queue it to sync on reconnect.
    if (isOffline()) {
      enqueueMutation({ kind: "state", body });
      setSyncMessage("Sin conexion: el cambio se guardara al reconectar.");
      return;
    }

    try {
      const response = await fetch("/api/cine/state", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      // On a server rejection re-sync so the UI never keeps an unpersisted change.
      if (!response.ok) {
        setCatalogError("No se pudo guardar el cambio. Recargando estado real.");
        await loadCatalog();
      }
    } catch {
      // Network dropped mid-request: queue it instead of losing the change.
      enqueueMutation({ kind: "state", body });
      setSyncMessage("Sin conexion: el cambio se guardara al reconectar.");
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

    const body = { tmdbId: currentTitle.tmdbId, mediaType: currentTitle.kind, category };

    if (isOffline()) {
      enqueueMutation({ kind: "pending", action, body });
      setSyncMessage("Sin conexion: el cambio se guardara al reconectar.");
      return;
    }

    try {
      const response = await fetch("/api/cine/pending", {
        method: action === "add" ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body),
      });
      if (!response.ok) await loadCatalog();
    } catch {
      enqueueMutation({ kind: "pending", action, body });
      setSyncMessage("Sin conexion: el cambio se guardara al reconectar.");
    }
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
    if (!currentTitle) return;

    // Toggle: if it is already watched for this scope, unmark it (set back to "none").
    const alreadyOn = scope === "both"
      ? currentTitle.personal.RR.status === "watched" && currentTitle.personal.LB.status === "watched"
      : currentTitle.personal[activeProfile].status === "watched";
    const nextStatus: WatchStatus = alreadyOn ? "none" : "watched";

    void persistState(currentTitle, { status: nextStatus, scope });

    setTitles((current) =>
      current.map((title) => {
        if (title.id !== titleId) return title;
        const apply = (profile: ProfileKey) => ({
          ...title.personal[profile],
          status: nextStatus,
          watchedAt: nextStatus === "watched" ? today : undefined,
        });
        const nextPersonal = { ...title.personal };
        if (scope === "both") {
          nextPersonal.RR = apply("RR");
          nextPersonal.LB = apply("LB");
        } else {
          nextPersonal[activeProfile] = apply(activeProfile);
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
              trendingKeys={trendingKeys}
              setSelectedTitleId={setSelectedTitleId}
              setActiveTab={setActiveTab}
              markWatched={markWatched}
              activeProfile={activeProfile}
              updatePendingCategory={updatePendingCategory}
              openDetail={setDetailTitle}
              openRating={setRatingFor}
            />
          )}
          {activeTab === "explore" && (
            <ExploreView
              titles={filteredTitles}
              filters={filters}
              setFilters={setFilters}
              setSelectedTitleId={setSelectedTitleId}
              markWatched={markWatched}
              activeProfile={activeProfile}
              updatePendingCategory={updatePendingCategory}
              openDetail={setDetailTitle}
              openRating={setRatingFor}
            />
          )}
          {activeTab === "today" && (
            <TodayView titles={titles} activeProfile={activeProfile} openDetail={setDetailTitle} />
          )}
          {activeTab === "pending" && (
            <PendingView titles={pendingTitles} openDetail={setDetailTitle} />
          )}
          {activeTab === "ratings" && <RatingsView titles={titles} />}
          <p className="mt-6 text-center text-[10px] leading-4 text-[var(--muted)]">
            Datos e imagenes de TMDB. Disponibilidad de streaming via TMDB/JustWatch.
          </p>
        </section>

        <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[520px] -translate-x-1/2 border-t border-white/10 bg-[rgba(10,8,9,0.92)] px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-1">
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
      {(!online || pendingWrites > 0) && (
        <div
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] left-1/2 z-40 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs font-semibold text-[var(--text-soft)] backdrop-blur"
          aria-live="polite"
        >
          {online ? (
            <RefreshCw size={15} className="animate-spin text-[var(--gold)]" />
          ) : (
            <CloudOff size={15} className="text-[var(--muted)]" />
          )}
          {!online
            ? `Sin conexion${pendingWrites ? ` - ${pendingWrites} por sincronizar` : " - ultimo catalogo guardado"}`
            : `Sincronizando ${pendingWrites} cambio${pendingWrites === 1 ? "" : "s"}...`}
        </div>
      )}
      {detailTitle && (
        <TitleDetailSheet
          title={detailTitle}
          accessToken={accessToken}
          activeProfile={activeProfile}
          onClose={() => setDetailTitle(null)}
          markWatched={markWatched}
          openRating={setRatingFor}
          updatePendingCategory={updatePendingCategory}
        />
      )}
      {ratingFor && (
        <RatingModal
          title={ratingFor}
          activeProfile={activeProfile}
          onPick={(rating) => {
            updateRating(ratingFor.id, activeProfile, rating);
            setRatingFor(null);
          }}
          onClose={() => setRatingFor(null)}
        />
      )}
    </main>
  );
}

function RatingModal({
  title,
  activeProfile,
  onPick,
  onClose,
}: {
  title: CineTitle;
  activeProfile: ProfileKey;
  onPick: (rating: number | null) => void;
  onClose: () => void;
}) {
  const current = title.personal[activeProfile].rating;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-[420px] rounded-t-3xl border border-white/10 bg-[var(--app-bg)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl shadow-black/60 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Nota de {activeProfile}</p>
            <p className="truncate text-lg font-semibold">{title.title}</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/8 text-[var(--text-soft)]" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onPick(rating)}
              className={`h-12 rounded-xl text-base font-black transition ${
                current === rating ? "bg-[var(--gold)] text-black" : "bg-white/8 text-[var(--text-soft)] hover:bg-white/14"
              }`}
            >
              {rating}
            </button>
          ))}
        </div>
        {current != null && (
          <button type="button" onClick={() => onPick(null)} className="mt-3 w-full rounded-xl border border-white/10 bg-white/6 py-2.5 text-sm font-semibold text-[var(--text-soft)]">
            Quitar nota
          </button>
        )}
      </div>
    </div>
  );
}

function NotaButton({
  title,
  activeProfile,
  openRating,
  compact = false,
}: {
  title: CineTitle;
  activeProfile: ProfileKey;
  openRating: (title: CineTitle) => void;
  compact?: boolean;
}) {
  const value = title.personal[activeProfile].rating;
  if (compact) {
    return (
      <button
        type="button"
        onClick={() => openRating(title)}
        aria-label="Poner nota"
        className={`grid h-11 w-11 place-items-center rounded-xl text-sm font-black transition ${
          value ? "bg-[var(--gold)] text-black" : "bg-white/8 text-[var(--text-soft)] hover:bg-white/14"
        }`}
      >
        {value ?? <Star size={18} />}
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={() => openRating(title)}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-black/24 py-2.5 text-sm font-semibold text-[var(--text-soft)] transition hover:bg-black/40"
    >
      <Star size={17} className={value ? "text-[var(--gold)]" : ""} />
      {value ? `Tu nota: ${value}/10` : `Poner nota (${activeProfile})`}
    </button>
  );
}

function HomeView({
  titles,
  selectedTitle,
  bestShared,
  trendingKeys,
  setSelectedTitleId,
  setActiveTab,
  markWatched,
  activeProfile,
  updatePendingCategory,
  openDetail,
  openRating
}: {
  titles: CineTitle[];
  selectedTitle: CineTitle;
  bestShared: Array<{ title: CineTitle; average: number }>;
  trendingKeys: string[];
  setSelectedTitleId: (id: string) => void;
  setActiveTab: (tab: TabKey) => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  activeProfile: ProfileKey;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
  openDetail: (title: CineTitle) => void;
  openRating: (title: CineTitle) => void;
}) {
  const shelves = useMemo(() => {
    const unwatchedTogether = titles.filter(
      (title) => title.personal.RR.status !== "watched" && title.personal.LB.status !== "watched"
    );

    const bestImdb = [...titles]
      .filter((title) => title.imdbRating)
      .sort((a, b) => (b.imdbRating ?? 0) - (a.imdbRating ?? 0))
      .slice(0, 20);

    const trendingOrder = new Map(trendingKeys.map((key, index) => [key, index]));
    const trending = titles
      .filter((title) => trendingOrder.has(`${title.kind}-${title.tmdbId}`))
      .sort((a, b) => (trendingOrder.get(`${a.kind}-${a.tmdbId}`) ?? 0) - (trendingOrder.get(`${b.kind}-${b.tmdbId}`) ?? 0));

    const novedades = [...titles]
      .filter((title) => title.addedAt)
      .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""))
      .slice(0, 20);

    const byProvider = providers
      .map((provider) => ({
        provider,
        titles: [...titles]
          .filter((title) => title.availability.some((item) => item.provider === provider.key))
          .sort((a, b) => b.tmdbPopularity - a.tmdbPopularity)
          .slice(0, 20),
      }))
      .filter((shelf) => shelf.titles.length > 0);

    const genreCounts = new Map<string, number>();
    for (const title of titles) for (const g of title.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
    const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([g]) => g);
    const byGenre = topGenres.map((genre) => ({
      genre,
      titles: [...titles]
        .filter((title) => title.genres.includes(genre))
        .sort((a, b) => (b.imdbRating ?? b.tmdbRating ?? 0) - (a.imdbRating ?? a.tmdbRating ?? 0))
        .slice(0, 20),
    }));

    return { unwatchedTogether, bestImdb, trending, novedades, byProvider, byGenre };
  }, [titles, trendingKeys]);

  // Tapping a shelf poster opens the full detail sheet (and syncs the hero behind it).
  const openShelfTitle = (title: CineTitle) => {
    setSelectedTitleId(title.id);
    openDetail(title);
  };

  return (
    <div className="space-y-5">
      <HeroTitle
        title={selectedTitle}
        activeProfile={activeProfile}
        markWatched={markWatched}
        updatePendingCategory={updatePendingCategory}
        openDetail={openDetail}
        openRating={openRating}
      />

      {shelves.unwatchedTogether.length > 0 && (
        <>
          <SectionHeader icon={Sparkles} title="Para decidir hoy" action="Buscar" onAction={() => setActiveTab("explore")} />
          <HorizontalShelf titles={shelves.unwatchedTogether} onSelect={openShelfTitle} />
        </>
      )}

      {shelves.trending.length > 0 && (
        <>
          <SectionHeader icon={Flame} title="Tendencia esta semana" />
          <HorizontalShelf titles={shelves.trending} onSelect={openShelfTitle} />
        </>
      )}

      {shelves.bestImdb.length > 0 && (
        <>
          <SectionHeader icon={Trophy} title="Mejores IMDb disponibles" />
          <HorizontalShelf titles={shelves.bestImdb} onSelect={openShelfTitle} />
        </>
      )}

      {shelves.novedades.length > 0 && (
        <>
          <SectionHeader icon={Sparkles} title="Novedades en el catalogo" />
          <HorizontalShelf titles={shelves.novedades} onSelect={openShelfTitle} />
        </>
      )}

      {bestShared.length > 0 && (
        <>
          <SectionHeader icon={Users} title="Mejor valoradas por vosotros" action="Notas" onAction={() => setActiveTab("ratings")} />
          <HorizontalShelf titles={bestShared.map((item) => item.title)} onSelect={openShelfTitle} />
        </>
      )}

      {shelves.byProvider.map(({ provider, titles: providerTitles }) => (
        <div key={provider.key}>
          <SectionHeader icon={Ticket} title={provider.name} />
          <HorizontalShelf titles={providerTitles} onSelect={openShelfTitle} />
        </div>
      ))}

      {shelves.byGenre.map(({ genre, titles: genreTitles }) => (
        <div key={genre}>
          <SectionHeader icon={Film} title={genre} />
          <HorizontalShelf titles={genreTitles} onSelect={openShelfTitle} />
        </div>
      ))}
    </div>
  );
}

function ExploreView({
  titles,
  filters,
  setFilters,
  setSelectedTitleId,
  markWatched,
  activeProfile,
  updatePendingCategory,
  openDetail,
  openRating
}: {
  titles: CineTitle[];
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  setSelectedTitleId: (id: string) => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  activeProfile: ProfileKey;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
  openDetail: (title: CineTitle) => void;
  openRating: (title: CineTitle) => void;
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
            markWatched={markWatched}
            updatePendingCategory={updatePendingCategory}
            openDetail={openDetail}
            openRating={openRating}
          />
        ))}
      </div>
    </div>
  );
}

function TodayView({
  titles,
  activeProfile,
  openDetail
}: {
  titles: CineTitle[];
  activeProfile: ProfileKey;
  openDetail: (title: CineTitle) => void;
}) {
  const [scope, setScope] = useState<TodayScope>("both");
  const [kind, setKind] = useState<"all" | MediaKind>("all");
  const [maxMinutes, setMaxMinutes] = useState(0);
  const [minScore, setMinScore] = useState(0);
  const [selectedProviders, setSelectedProviders] = useState<ProviderKey[]>([]);
  const [genre, setGenre] = useState("");
  const [seed, setSeed] = useState(0);

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    for (const title of titles) for (const g of title.genres) set.add(g);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [titles]);

  const affinityRR = useMemo(() => genreAffinity(titles, "RR"), [titles]);
  const affinityLB = useMemo(() => genreAffinity(titles, "LB"), [titles]);

  const picks = useMemo(() => {
    const candidates = titles.filter((title) => {
      const unseen = scope === "both"
        ? title.personal.RR.status !== "watched" && title.personal.LB.status !== "watched"
        : title.personal[activeProfile].status !== "watched";
      if (!unseen) return false;
      if (kind !== "all" && title.kind !== kind) return false;
      if (selectedProviders.length && !selectedProviders.some((p) => title.availability.some((a) => a.provider === p))) return false;
      if (maxMinutes > 0 && title.runtimeMinutes && title.runtimeMinutes > maxMinutes) return false;
      if (minScore > 0 && blendedScore(title) < minScore) return false;
      if (genre && !title.genres.includes(genre)) return false;
      return true;
    });

    return candidates
      .map((title) => {
        const base = blendedScore(title);
        // Consensus by learned genre taste: for "both" favour titles both would like (min),
        // for a single user use only their own affinity. Falls back to the rating blend.
        const consensus =
          scope === "both"
            ? consensusAffinity(title, affinityRR, affinityLB)
            : predictedAffinity(title, activeProfile === "RR" ? affinityRR : affinityLB);
        const score = base * 0.6 + (consensus ?? base) * 0.4 + seededJitter(title.id, seed);
        return { title, score };
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 5);
  }, [titles, scope, kind, activeProfile, selectedProviders, maxMinutes, minScore, genre, seed, affinityRR, affinityLB]);

  return (
    <div className="space-y-4">
      <SectionHeader icon={Dices} title="Que vemos hoy" />

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/6 p-3">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-black/24 p-1">
          <button type="button" onClick={() => setScope("both")} aria-pressed={scope === "both"} className={`h-10 rounded-xl text-sm font-bold transition ${scope === "both" ? "bg-[var(--gold)] text-black" : "text-[var(--text-soft)]"}`}>
            Para los dos
          </button>
          <button type="button" onClick={() => setScope("me")} aria-pressed={scope === "me"} className={`h-10 rounded-xl text-sm font-bold transition ${scope === "me" ? "bg-[var(--gold)] text-black" : "text-[var(--text-soft)]"}`}>
            Solo {activeProfile}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <FilterChip active={kind === "all"} onClick={() => setKind("all")}>Todo</FilterChip>
          <FilterChip active={kind === "movie"} onClick={() => setKind("movie")}>Pelis</FilterChip>
          <FilterChip active={kind === "series"} onClick={() => setKind("series")}>Series</FilterChip>
        </div>

        <div className="space-y-2 rounded-xl bg-black/24 p-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><Ticket size={15} /> Plataformas</div>
          <div className="flex flex-wrap gap-1.5">
            {providers.map((provider) => (
              <FilterChip
                key={provider.key}
                active={selectedProviders.includes(provider.key)}
                onClick={() => setSelectedProviders((current) => current.includes(provider.key) ? current.filter((p) => p !== provider.key) : [...current, provider.key])}
              >
                {provider.shortName}
              </FilterChip>
            ))}
          </div>
        </div>

        <SelectField icon={Film} value={genre} onChange={setGenre}>
          <option value="">Cualquier genero</option>
          {allGenres.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </SelectField>

        <label className="block rounded-xl bg-black/24 px-3 py-2">
          <span className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
            Tiempo disponible <strong className="text-[var(--text-main)]">{maxMinutes ? formatRuntime(maxMinutes) : "Cualquiera"}</strong>
          </span>
          <input type="range" min="0" max="210" step="15" value={maxMinutes} onChange={(event) => setMaxMinutes(Number(event.target.value))} className="w-full accent-[var(--gold)]" />
        </label>

        <label className="block rounded-xl bg-black/24 px-3 py-2">
          <span className="mb-1 flex items-center justify-between text-xs text-[var(--muted)]">
            Nota minima <strong className="text-[var(--text-main)]">{minScore ? `${minScore}/10` : "Cualquiera"}</strong>
          </span>
          <input type="range" min="0" max="10" step="1" value={minScore} onChange={(event) => setMinScore(Number(event.target.value))} className="w-full accent-[var(--gold)]" />
        </label>

        <button type="button" onClick={() => setSeed((value) => value + 1)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--gold)] py-3 text-sm font-bold text-black">
          <Dices size={18} /> Otra ruleta
        </button>
      </div>

      {picks.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/6 p-4 text-sm text-[var(--muted)]">
          No hay candidatas con estos filtros. Prueba a quitar plataforma, genero o tiempo.
        </p>
      ) : (
        <div className="space-y-2">
          {picks.map(({ title, score }) => (
            <div key={title.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/6 p-3">
              <button type="button" onClick={() => openDetail(title)} className="shrink-0">
                <Poster title={title} size="small" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{title.title}</p>
                <p className="truncate text-sm text-[var(--muted)]">{formatTitleMeta(title, true)}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {title.availability.slice(0, 3).map((item) => (
                    <ProviderBadge key={`${title.id}-${item.provider}`} provider={item.provider} type={item.type} compact />
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-[var(--gold)] text-sm font-black text-black">{score.toFixed(1)}</div>
                <button type="button" onClick={() => openDetail(title)} className="text-[10px] font-semibold text-[var(--muted)]">Ficha</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PendingView({
  titles,
  openDetail
}: {
  titles: CineTitle[];
  openDetail: (title: CineTitle) => void;
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
            <HorizontalShelf titles={categoryTitles} onSelect={openDetail} />
          </section>
        );
      })}
    </div>
  );
}

function RatingsView({ titles }: { titles: CineTitle[] }) {
  const rated = titles
    .filter((title) => title.personal.RR.rating || title.personal.LB.rating)
    .map((title) => {
      const rr = title.personal.RR.rating;
      const lb = title.personal.LB.rating;
      return {
        title,
        rr,
        lb,
        average: coupleRating(title) ?? 0,
        gap: rr && lb ? Math.abs(rr - lb) : null,
      };
    })
    .sort((left, right) => right.average - left.average);

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
              <p className="text-sm text-[var(--muted)]">{gap === null ? "Solo un voto" : `Diferencia: ${gap}`}</p>
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
  updatePendingCategory,
  openDetail,
  openRating
}: {
  title: CineTitle;
  activeProfile: ProfileKey;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
  openDetail: (title: CineTitle) => void;
  openRating: (title: CineTitle) => void;
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
        <NotaButton title={title} activeProfile={activeProfile} openRating={openRating} />
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
  openRating,
  updatePendingCategory
}: {
  title: CineTitle;
  accessToken?: string;
  activeProfile: ProfileKey;
  onClose: () => void;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  openRating: (title: CineTitle) => void;
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
          <NotaButton title={title} activeProfile={activeProfile} openRating={openRating} />
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
  markWatched,
  updatePendingCategory,
  openDetail,
  openRating
}: {
  title: CineTitle;
  onSelect: () => void;
  activeProfile: ProfileKey;
  markWatched: (titleId: string, scope: "me" | "both") => void;
  updatePendingCategory: (titleId: string, category: PendingCategory, action: "add" | "remove") => void;
  openDetail: (title: CineTitle) => void;
  openRating: (title: CineTitle) => void;
}) {
  const isPending = title.pendingCategories.includes("Para ver juntos");
  const bothWatched = title.personal.RR.status === "watched" && title.personal.LB.status === "watched";
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
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {title.availability.map((item) => (
              <ProviderBadge key={`${title.id}-${item.provider}-${item.type}`} provider={item.provider} type={item.type} compact />
            ))}
            {(title.personal.RR.rating || title.personal.LB.rating) && (
              <span className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-[var(--muted)]">
                {title.personal.RR.rating && <span>RR {title.personal.RR.rating}</span>}
                {title.personal.LB.rating && <span>LB {title.personal.LB.rating}</span>}
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="mt-3 flex items-center gap-2">
        <NotaButton title={title} activeProfile={activeProfile} openRating={openRating} compact />
        <button type="button" onClick={() => openDetail(title)} className="icon-action" aria-label="Ver ficha">
          <Info size={18} />
        </button>
        <button
          type="button"
          onClick={() => updatePendingCategory(title.id, "Para ver juntos", isPending ? "remove" : "add")}
          className={`icon-action ${isPending ? "action-button-done" : ""}`}
          aria-label="Pendiente para ver juntos"
        >
          <BookmarkPlus size={18} />
        </button>
        <button
          type="button"
          onClick={() => markWatched(title.id, "both")}
          className={`icon-action ml-auto ${bothWatched ? "action-button-done" : ""}`}
          aria-label="Vista por ambos"
        >
          <Users size={18} />
        </button>
      </div>
    </article>
  );
}

function HorizontalShelf({
  titles,
  onSelect
}: {
  titles: CineTitle[];
  onSelect: (title: CineTitle) => void;
}) {
  return (
    <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
      {titles.map((title) => (
        <button
          key={title.id}
          type="button"
          onClick={() => onSelect(title)}
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
      <Metric label="Metacritic" value={title.metascore != null ? `${title.metascore}` : "-"} />
      <a
        href={rottenTomatoesSearch(title)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-20 flex-col items-center justify-center rounded-xl border border-white/8 bg-white/6 p-3 transition hover:bg-white/12"
        aria-label="Buscar en Rotten Tomatoes"
      >
        <span className="text-2xl leading-none">🍅</span>
        <span className="mt-1 text-[10px] text-[var(--muted)]">Rotten T.</span>
      </a>
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
      {type !== "included" && <span className="text-[var(--muted)]">{monetizationLabels[type]}</span>}
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
  return title.metascore != null ? title.metascore / 10 : undefined;
}

// Couple rating: average only when both voted; otherwise the single vote we have.
function coupleRating(title: CineTitle): number | undefined {
  const rr = title.personal.RR.rating;
  const lb = title.personal.LB.rating;
  if (rr && lb) return (rr + lb) / 2;
  return rr ?? lb ?? undefined;
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

// Average rating a profile has given, per genre (learned taste on a 1-10 scale).
function genreAffinity(titles: CineTitle[], profile: ProfileKey) {
  const sums = new Map<string, { total: number; count: number }>();
  for (const title of titles) {
    const rating = title.personal[profile].rating;
    if (!rating) continue;
    for (const genre of title.genres) {
      const entry = sums.get(genre) ?? { total: 0, count: 0 };
      entry.total += rating;
      entry.count += 1;
      sums.set(genre, entry);
    }
  }
  const affinity = new Map<string, number>();
  for (const [genre, { total, count }] of sums) affinity.set(genre, total / count);
  return affinity;
}

// Predicted score for a title from a profile's genre affinity; undefined if no signal.
function predictedAffinity(title: CineTitle, affinity: Map<string, number>) {
  const values = title.genres.map((genre) => affinity.get(genre)).filter((value): value is number => value !== undefined);
  if (!values.length) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// For "both": favour titles both would like by taking the lower predicted affinity.
function consensusAffinity(title: CineTitle, affinityRR: Map<string, number>, affinityLB: Map<string, number>) {
  const rr = predictedAffinity(title, affinityRR);
  const lb = predictedAffinity(title, affinityLB);
  if (rr === undefined && lb === undefined) return undefined;
  if (rr === undefined) return lb;
  if (lb === undefined) return rr;
  return Math.min(rr, lb);
}

// Blend of every available rating source on a 0-10 scale; unknown => neutral 5.
function blendedScore(title: CineTitle) {
  const parts: number[] = [];
  if (title.imdbRating) parts.push(title.imdbRating);
  if (title.tmdbRating) parts.push(title.tmdbRating);
  if (title.rtTomatometer != null) parts.push(title.rtTomatometer / 10);
  if (title.metascore != null) parts.push(title.metascore / 10);
  if (!parts.length) return 5;
  return parts.reduce((sum, value) => sum + value, 0) / parts.length;
}

// Small deterministic jitter so "Otra ruleta" reshuffles among good candidates without a full re-render randomness.
function seededJitter(id: string, seed: number) {
  let hash = seed * 2654435761;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash ^ id.charCodeAt(index)) * 16777619;
  }
  const normalized = ((hash >>> 0) % 1000) / 1000;
  return normalized * 0.9;
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


