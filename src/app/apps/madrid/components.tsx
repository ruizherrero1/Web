"use client";

import { useState } from "react";
import {
  COMP_COLORS,
  broadcastFor,
  formatMadridDate,
  formatMadridTime,
  isMadrid,
  scoreLabel,
} from "./helpers";
import { themeConfigs } from "./theme";
import type {
  CompId,
  LeagueMatch,
  LineupPlayer,
  LiveLineupPlayer,
  MadridMatch,
  MatchDetail,
  MatchLive,
  Scorer,
  SquadPlayer,
  StandingRow,
  ThemeId,
} from "./types";

export function ThemeSelector({
  activeTheme,
  onThemeChange,
}: {
  activeTheme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-white/20 bg-black/20 p-1">
      {(Object.keys(themeConfigs) as ThemeId[]).map((id) => (
        <button
          key={id}
          type="button"
          title={themeConfigs[id].label}
          aria-label={`Tema ${themeConfigs[id].label}`}
          aria-pressed={activeTheme === id}
          onClick={() => onThemeChange(id)}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
            activeTheme === id ? "bg-white/25 ring-1 ring-white/60" : "hover:bg-white/10"
          }`}
        >
          <span
            className="h-3.5 w-3.5 rounded-full border border-white/40"
            style={{ background: themeConfigs[id].swatch }}
          />
        </button>
      ))}
    </div>
  );
}

export function CompBadge({ comp, label }: { comp: CompId; label: string }) {
  const colors = COMP_COLORS[comp];
  return (
    <span
      className="inline-flex min-h-6 items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.06em]"
      style={{ background: colors.bg, color: colors.color }}
    >
      {label}
    </span>
  );
}

function TeamLogo({ src, alt, size = 20 }: { src?: string; alt: string; size?: number }) {
  if (!src) {
    return (
      <span
        className="inline-block shrink-0 rounded-full bg-[var(--rm-panel-bg)]"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

function TeamName({ name, align = "left" }: { name: string; align?: "left" | "right" }) {
  const highlight = isMadrid(name);
  return (
    <span
      className={`min-w-0 truncate ${highlight ? "text-[var(--rm-accent)]" : "text-[var(--rm-text)]"} ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {name}
    </span>
  );
}

function ResultDot({ result }: { result?: MadridMatch["result"] }) {
  if (!result) return null;
  const map = {
    W: { c: "var(--rm-win)", t: "G" },
    D: { c: "var(--rm-draw)", t: "E" },
    L: { c: "var(--rm-loss)", t: "P" },
  } as const;
  const { c, t } = map[result];
  return (
    <span
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
      style={{ background: c }}
      title={result === "W" ? "Victoria" : result === "D" ? "Empate" : "Derrota"}
    >
      {t}
    </span>
  );
}

export function LiveBadge({ minute }: { minute?: string }) {
  return (
    <span className="inline-flex min-h-6 items-center gap-1.5 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-red-500">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]" />
      Live{minute ? ` · ${minute}` : ""}
    </span>
  );
}

export function MatchRow({ match, domId }: { match: MadridMatch; domId?: string }) {
  const score = scoreLabel(match);
  // Terminados con footballdata.io (xG/posesion); proximos/en directo (y
  // terminados sin footballdata) con ESPN summary (once, cambios, tarjetas).
  const useFootball = Boolean(match.detailId) && match.status === "finished";
  const useLive = !useFootball && Boolean(match.espnId);
  const canExpand = useFootball || useLive;
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [live, setLive] = useState<MatchLive | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  function toggle() {
    if (!canExpand) return;
    const next = !expanded;
    setExpanded(next);
    if (next && detail === null && live === null && !loading && !failed) {
      setLoading(true);
      const url = useFootball
        ? `/api/madrid/match/${match.detailId}`
        : `/api/madrid/live/${match.espnId}?comp=${match.comp}`;
      fetch(url, { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
        .then((payload) => {
          if (useFootball) setDetail(payload.detail as MatchDetail);
          else setLive(payload.live as MatchLive);
        })
        .catch(() => setFailed(true))
        .finally(() => setLoading(false));
    }
  }

  return (
    <article
      id={domId}
      className={`rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-3 shadow-sm transition hover:border-[var(--rm-accent)] ${
        canExpand ? "cursor-pointer select-none" : ""
      }`}
      onClick={canExpand ? toggle : undefined}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-x-2">
          <span className="font-bold capitalize text-[var(--rm-text)]">
            {formatMadridDate(match.startsAt)}
          </span>
          <span className="text-[var(--rm-muted)]">·</span>
          <span className="text-[var(--rm-muted)]">{formatMadridTime(match.startsAt)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {match.status === "live" ? <LiveBadge minute={match.statusDetail ?? undefined} /> : null}
          {match.status === "finished" ? <ResultDot result={match.result} /> : null}
          <CompBadge comp={match.comp} label={match.compLabel} />
          {canExpand ? (
            <span
              className={`text-[var(--rm-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5l5 5 5-5" />
              </svg>
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center justify-end gap-2 text-[13px] font-bold sm:text-sm">
          <TeamName name={match.home} align="right" />
          <TeamLogo src={match.homeLogo} alt={match.home} size={34} />
        </div>
        <div className="shrink-0 whitespace-nowrap rounded bg-[var(--rm-score-bg)] px-2 py-1 text-xs font-black text-[var(--rm-score-text)] sm:px-2.5">
          {score}
        </div>
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-bold sm:text-sm">
          <TeamLogo src={match.awayLogo} alt={match.away} size={34} />
          <TeamName name={match.away} />
        </div>
      </div>
      {match.round ? (
        <p className="mt-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--rm-muted)]">
          {match.round}
        </p>
      ) : null}
      {/* Estadio a la izquierda, canal de TV a la derecha (una sola linea). */}
      <div className="mt-1.5 flex items-center justify-between gap-3 text-[11px] text-[var(--rm-muted)]">
        <span className="min-w-0 truncate">{match.venue ?? ""}</span>
        <span className="flex shrink-0 items-center gap-1">
          <span aria-hidden>📺</span>
          {broadcastFor(match.comp)}
        </span>
      </div>
      {expanded ? (
        <div onClick={(event) => event.stopPropagation()}>
          {loading ? (
            <p className="mt-3 border-t border-[var(--rm-border-inner)] pt-3 text-center text-xs text-[var(--rm-muted)]">
              Cargando detalle…
            </p>
          ) : detail ? (
            <MatchDetailPanel detail={detail} />
          ) : live ? (
            <LiveDetailPanel live={live} upcoming={match.status === "upcoming"} />
          ) : (
            <p className="mt-3 border-t border-[var(--rm-border-inner)] pt-3 text-center text-xs text-[var(--rm-muted)]">
              No hay detalle disponible para este partido.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}

function StatBar({ item }: { item: MatchDetail["stats"][number] }) {
  const total = item.home + item.away || 1;
  const homePct = Math.round((item.home / total) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold text-[var(--rm-text)]">
        <span>
          {item.home}
          {item.suffix ?? ""}
        </span>
        <span className="text-[var(--rm-muted)]">{item.label}</span>
        <span>
          {item.away}
          {item.suffix ?? ""}
        </span>
      </div>
      <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-[var(--rm-panel-bg)]">
        <span className="bg-[var(--rm-accent)]" style={{ width: `${homePct}%` }} />
        <span className="bg-[var(--rm-muted)]" style={{ width: `${100 - homePct}%` }} />
      </div>
    </div>
  );
}

function LineupColumn({ players, align }: { players: LineupPlayer[]; align: "left" | "right" }) {
  return (
    <ul className={`space-y-1 ${align === "right" ? "text-right" : ""}`}>
      {players.map((player, index) => (
        <li key={`${player.name}-${index}`} className="text-xs text-[var(--rm-text)]">
          <span className="text-[var(--rm-muted)]">{player.number ?? "·"}</span>{" "}
          <span className="font-medium">{player.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function MatchDetailPanel({ detail }: { detail: MatchDetail }) {
  const homeGoals = detail.goals.filter((goal) => goal.side === "home");
  const awayGoals = detail.goals.filter((goal) => goal.side === "away");
  const hasLineups = detail.lineups.home.length > 0 || detail.lineups.away.length > 0;

  return (
    <div className="mt-3 space-y-4 border-t border-[var(--rm-border-inner)] pt-3">
      {(detail.competition || detail.gameWeek || detail.attendance) ? (
        <p className="text-center text-[11px] text-[var(--rm-muted)]">
          {[
            detail.competition,
            detail.gameWeek ? `Jornada ${detail.gameWeek}` : null,
            detail.attendance ? `${detail.attendance.toLocaleString("es-ES")} espectadores` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {detail.goals.length > 0 ? (
        <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 text-[11px]">
          <div className="space-y-1 text-right">
            {homeGoals.map((goal, index) => (
              <div key={index} className="text-[var(--rm-text)]">
                <span className="text-[var(--rm-muted)]">{goal.assist ? `${goal.assist} ` : ""}</span>
                {goal.player}
                <span className="ml-1 font-bold text-[var(--rm-accent)]">
                  {goal.minute}
                  {goal.extra ? `+${goal.extra}` : ""}&apos;
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center text-[var(--rm-muted)]">
            <span aria-hidden>⚽</span>
          </div>
          <div className="space-y-1">
            {awayGoals.map((goal, index) => (
              <div key={index} className="text-[var(--rm-text)]">
                <span className="mr-1 font-bold text-[var(--rm-accent)]">
                  {goal.minute}
                  {goal.extra ? `+${goal.extra}` : ""}&apos;
                </span>
                {goal.player}
                <span className="text-[var(--rm-muted)]">{goal.assist ? ` ${goal.assist}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {detail.xg ? (
        <StatBar item={{ label: "xG", home: detail.xg.home, away: detail.xg.away }} />
      ) : null}
      {detail.stats.length > 0 ? (
        <div className="space-y-2">
          {detail.stats.map((item) => (
            <StatBar key={item.label} item={item} />
          ))}
        </div>
      ) : null}

      {hasLineups ? (
        <div>
          <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.1em] text-[var(--rm-muted)]">
            Onces iniciales
          </p>
          <div className="grid grid-cols-2 gap-3">
            <LineupColumn players={detail.lineups.home} align="left" />
            <LineupColumn players={detail.lineups.away} align="right" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function StandingsTable({
  rows,
  title = "Clasificación · LaLiga",
  note,
}: {
  rows: StandingRow[];
  title?: string;
  note?: string;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--rm-border)] bg-[var(--rm-card-header)] px-4 py-3 text-white">
        <h2 className="text-lg font-bold">{title}</h2>
        {note ? <span className="text-xs font-semibold text-white/60">{note}</span> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-[var(--rm-panel-bg)] text-left text-[10px] uppercase tracking-[0.08em] text-[var(--rm-muted)] sm:text-xs">
            <tr>
              <th className="px-2 py-2 sm:px-4 sm:py-3">Equipo</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">PJ</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">G</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">E</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">P</th>
              <th className="hidden px-3 py-3 text-center sm:table-cell">GF</th>
              <th className="hidden px-3 py-3 text-center sm:table-cell">GC</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">DG</th>
              <th className="px-2 py-2 text-center sm:px-4 sm:py-3">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rm-border-inner)]">
            {rows.map((row) => (
              <tr
                key={row.team}
                className={row.isMadrid ? "bg-[var(--rm-row-hl)] font-semibold" : undefined}
              >
                <td className="min-w-0 px-2 py-2 font-bold text-[var(--rm-text)] sm:px-4 sm:py-3">
                  <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--rm-panel-bg)] text-[10px] text-[var(--rm-muted)] sm:mr-2 sm:h-6 sm:w-6 sm:text-xs">
                    {row.rank}
                  </span>
                  <span className="inline-flex items-center gap-1.5 align-middle">
                    <TeamLogo src={row.logo} alt={row.team} />
                    <span className={row.isMadrid ? "text-[var(--rm-accent)]" : undefined}>
                      {row.team}
                    </span>
                  </span>
                </td>
                <Cell>{row.played}</Cell>
                <Cell>{row.wins}</Cell>
                <Cell>{row.draws}</Cell>
                <Cell>{row.losses}</Cell>
                <HiddenCell>{row.goalsFor}</HiddenCell>
                <HiddenCell>{row.goalsAgainst}</HiddenCell>
                <Cell>{row.goalDifference}</Cell>
                <td className="px-2 py-2 text-center text-sm font-black text-[var(--rm-accent)] sm:px-4 sm:py-3 sm:text-base">
                  {row.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

const POSITION_ORDER = ["Porteros", "Defensas", "Centrocampistas", "Delanteros", "Otros"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Foto del jugador con caida a iniciales si la URL no existe (algunas se
// construyen por nombre y pueden no estar en footballdata.io).
function PlayerAvatar({
  player,
  size,
  className = "",
}: {
  player: SquadPlayer;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (player.photo && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={player.photo}
        alt={player.name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`rounded-full bg-[var(--rm-panel-bg)] object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-[var(--rm-panel-bg)] font-black text-[var(--rm-accent)] ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {initials(player.name)}
    </span>
  );
}

function PlayerCard({ player, onSelect }: { player: SquadPlayer; onSelect: (player: SquadPlayer) => void }) {
  const details = [
    player.age ? `${player.age} años` : null,
    player.height,
    player.weight,
  ].filter(Boolean);
  return (
    <li
      className="flex cursor-pointer items-center gap-3 px-4 py-3 transition hover:bg-[var(--rm-row-hl)]"
      onClick={() => onSelect(player)}
    >
      <div className="relative shrink-0">
        <PlayerAvatar player={player} size={44} />
        {player.number ? (
          <span className="absolute -bottom-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--rm-card-bg)] bg-[var(--rm-accent)] px-1 text-[10px] font-black text-[var(--rm-accent-fg)]">
            {player.number}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate font-semibold text-[var(--rm-text)]">
          {player.countryFlag ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={player.countryFlag}
              alt={player.country ?? ""}
              width={18}
              height={13}
              className="h-3 w-4 shrink-0 rounded-[1px] object-cover"
            />
          ) : null}
          <span className="truncate">{player.name}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-[var(--rm-muted)]">
          {player.positionName}
          {details.length > 0 ? ` · ${details.join(" · ")}` : ""}
        </p>
      </div>
      {player.goals || player.assists ? (
        <div className="flex shrink-0 items-center gap-2 text-xs">
          {player.goals ? (
            <span className="inline-flex items-center gap-1 font-bold text-[var(--rm-text)]" title="Goles">
              <span aria-hidden>⚽</span>
              {player.goals}
            </span>
          ) : null}
          {player.assists ? (
            <span className="inline-flex items-center gap-1 text-[var(--rm-muted)]" title="Asistencias">
              <span aria-hidden>🅰️</span>
              {player.assists}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function PlayerStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-[var(--rm-panel-bg)] px-2 py-2 text-center">
      <p className="text-lg font-black text-[var(--rm-accent)]">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--rm-muted)]">
        {label}
      </p>
    </div>
  );
}

function PlayerModal({ player, onClose }: { player: SquadPlayer; onClose: () => void }) {
  const stats: { label: string; value: number }[] = [];
  if (player.appearances) stats.push({ label: "Partidos", value: player.appearances });
  if (player.minutes) stats.push({ label: "Minutos", value: player.minutes });
  if (player.goals) stats.push({ label: "Goles", value: player.goals });
  if (player.assists) stats.push({ label: "Asist.", value: player.assists });

  const bio = [
    player.age ? `${player.age} años` : null,
    player.country,
    player.height,
    player.weight,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-2xl border border-[var(--rm-border)] bg-[var(--rm-card-bg)] shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative flex items-center gap-4 bg-[var(--rm-card-header)] p-5 text-white">
          <PlayerAvatar player={player} size={80} className="border-2 border-white/30" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-lg font-black leading-tight">
              {player.countryFlag ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={player.countryFlag} alt={player.country ?? ""} width={22} height={16} className="h-4 w-5 rounded-[1px] object-cover" />
              ) : null}
              <span className="truncate">{player.name}</span>
            </p>
            <p className="mt-1 text-sm text-white/70">
              {player.number ? `#${player.number} · ` : ""}
              {player.positionName}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            ✕
          </button>
        </div>
        <div className="p-5">
          {bio.length > 0 ? (
            <p className="mb-4 text-sm text-[var(--rm-muted)]">{bio.join(" · ")}</p>
          ) : null}
          {stats.length > 0 ? (
            <>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.1em] text-[var(--rm-muted)]">
                Esta temporada
              </p>
              <div className="grid grid-cols-4 gap-2">
                {stats.map((stat) => (
                  <PlayerStat key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--rm-muted)]">
              Sin estadísticas de temporada disponibles todavía.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SquadList({ players }: { players: SquadPlayer[] }) {
  const [selected, setSelected] = useState<SquadPlayer | null>(null);
  const groups = POSITION_ORDER.map((group) => ({
    group,
    players: players
      .filter((player) => player.position === group)
      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99)),
  })).filter((entry) => entry.players.length > 0);

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {groups.map((entry) => (
          <article
            key={entry.group}
            className="overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-[var(--rm-border)] bg-[var(--rm-card-header)] px-4 py-3 text-white">
              <h3 className="text-base font-bold">{entry.group}</h3>
              <span className="text-xs font-semibold text-white/60">{entry.players.length}</span>
            </div>
            <ul className="divide-y divide-[var(--rm-border-inner)]">
              {entry.players.map((player) => (
                <PlayerCard
                  key={`${player.name}-${player.number ?? ""}`}
                  player={player}
                  onSelect={setSelected}
                />
              ))}
            </ul>
          </article>
        ))}
      </div>
      {selected ? <PlayerModal player={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

export function ScorersTable({
  scorers,
  title = "Goleadores del Madrid",
  subtitle = "esta temporada",
}: {
  scorers: Scorer[];
  title?: string;
  subtitle?: string;
}) {
  const hasAssists = scorers.some((scorer) => scorer.assists > 0);
  const hasPenalties = scorers.some((scorer) => scorer.penalties > 0);
  const hasTeam = scorers.some((scorer) => scorer.team);
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--rm-border)] bg-[var(--rm-card-header)] px-4 py-3 text-white">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs font-semibold text-white/70">{subtitle}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-[var(--rm-panel-bg)] text-left text-[10px] uppercase tracking-[0.08em] text-[var(--rm-muted)] sm:text-xs">
            <tr>
              <th className="px-2 py-2 sm:px-4 sm:py-3">Jugador</th>
              {hasTeam ? <th className="px-2 py-2 sm:px-4 sm:py-3">Equipo</th> : null}
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">Goles</th>
              {hasPenalties ? (
                <th className="hidden px-3 py-3 text-center sm:table-cell">Penaltis</th>
              ) : null}
              {hasAssists ? (
                <th className="hidden px-3 py-3 text-center sm:table-cell">Asist.</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rm-border-inner)]">
            {scorers.map((scorer, index) => (
              <tr
                key={`${scorer.name}-${scorer.team ?? ""}`}
                className={
                  scorer.isMadrid
                    ? "bg-[var(--rm-row-hl)] font-semibold"
                    : index < 3
                      ? "bg-[var(--rm-row-hl)]"
                      : undefined
                }
              >
                <td className="min-w-0 px-2 py-2 font-bold text-[var(--rm-text)] sm:px-4 sm:py-3">
                  <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--rm-panel-bg)] text-[10px] text-[var(--rm-muted)] sm:mr-2 sm:h-6 sm:w-6 sm:text-xs">
                    {index + 1}
                  </span>
                  <span className={scorer.isMadrid ? "text-[var(--rm-accent)]" : undefined}>
                    {scorer.name}
                  </span>
                </td>
                {hasTeam ? (
                  <td className="px-2 py-2 text-[var(--rm-muted)] sm:px-4 sm:py-3">{scorer.team}</td>
                ) : null}
                <td className="px-1.5 py-2 text-center text-sm font-black text-[var(--rm-accent)] sm:px-3 sm:py-3 sm:text-base">
                  {scorer.goals}
                </td>
                {hasPenalties ? (
                  <td className="hidden px-3 py-3 text-center text-[var(--rm-muted)] sm:table-cell">
                    {scorer.penalties}
                  </td>
                ) : null}
                {hasAssists ? (
                  <td className="hidden px-3 py-3 text-center text-[var(--rm-muted)] sm:table-cell">
                    {scorer.assists}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-1.5 py-2 text-center text-[var(--rm-muted)] sm:px-3 sm:py-3">{children}</td>;
}

function HiddenCell({ children }: { children: React.ReactNode }) {
  return <td className="hidden px-3 py-3 text-center text-[var(--rm-muted)] sm:table-cell">{children}</td>;
}

// --- Detalle en directo / pre-partido (ESPN summary): goles, tarjetas, cambios
// y onces. Disponible cuando ESPN publica el once (pre-partido) y en directo. ---
const LIVE_ICON: Record<string, string> = { goal: "⚽", yellow: "🟨", red: "🟥", sub: "🔁" };

function LiveLineupColumn({
  line,
  align,
}: {
  line: { starters: LiveLineupPlayer[]; bench: LiveLineupPlayer[] };
  align: "left" | "right";
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <ul className="space-y-1">
        {line.starters.map((player, index) => (
          <li key={`${player.name}-${index}`} className="text-[11px] text-[var(--rm-text)]">
            <span className="text-[var(--rm-muted)]">{player.number ?? "·"}</span>{" "}
            <span className="font-medium">{player.name}</span>
            {player.subbedOut ? <span className="text-[var(--rm-loss)]"> ↓</span> : null}
          </li>
        ))}
      </ul>
      {line.bench.some((p) => p.subbedIn) ? (
        <>
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.08em] text-[var(--rm-muted)]">
            Entraron
          </p>
          <ul className="space-y-0.5">
            {line.bench
              .filter((p) => p.subbedIn)
              .map((player, index) => (
                <li key={`${player.name}-${index}`} className="text-[10px] text-[var(--rm-muted)]">
                  {player.number ?? "·"} {player.name} <span className="text-[var(--rm-win)]">↑</span>
                </li>
              ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

export function LiveDetailPanel({ live, upcoming }: { live: MatchLive; upcoming: boolean }) {
  if (!live.hasLineups && live.events.length === 0) {
    return (
      <p className="mt-3 border-t border-[var(--rm-border-inner)] pt-3 text-center text-xs text-[var(--rm-muted)]">
        {upcoming
          ? "Las alineaciones se publican ~1 h antes del partido; aparecerán aquí."
          : "Sin datos de alineación para este partido."}
      </p>
    );
  }
  return (
    <div className="mt-3 space-y-4 border-t border-[var(--rm-border-inner)] pt-3">
      {live.homeScore != null && live.awayScore != null ? (
        <p className="text-center text-sm font-black text-[var(--rm-text)]">
          {live.home} {live.homeScore} - {live.awayScore} {live.away}
        </p>
      ) : null}

      {live.events.length > 0 ? (
        <div className="space-y-1">
          {live.events.map((event, index) => {
            const text = (
              <span className="min-w-0 truncate text-[var(--rm-text)]">
                {event.player}
                {event.type === "goal" && event.assist ? (
                  <span className="text-[var(--rm-muted)]"> ({event.assist})</span>
                ) : null}
                {event.type === "sub" && event.playerOut ? (
                  <span className="text-[var(--rm-muted)]"> ↔ {event.playerOut}</span>
                ) : null}
              </span>
            );
            const minute = (
              <span className="w-11 shrink-0 font-bold text-[var(--rm-accent)]">{event.minute}</span>
            );
            const icon = <span aria-hidden>{LIVE_ICON[event.type]}</span>;
            return (
              <div
                key={index}
                className={`flex items-center gap-2 text-[11px] ${event.side === "away" ? "flex-row-reverse text-right" : ""}`}
              >
                {minute}
                {icon}
                {text}
              </div>
            );
          })}
        </div>
      ) : null}

      {live.hasLineups ? (
        <div>
          <p className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.1em] text-[var(--rm-muted)]">
            Onces iniciales
          </p>
          <div className="grid grid-cols-2 gap-3">
            <LiveLineupColumn line={live.lineups.home} align="left" />
            <LiveLineupColumn line={live.lineups.away} align="right" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

// --- Fila del calendario general de ligas (cualquier equipo) ---
export function LeagueMatchRow({ match }: { match: LeagueMatch }) {
  const showScore =
    match.status !== "upcoming" && match.homeScore != null && match.awayScore != null;
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-2.5 shadow-sm ${
        match.isMadrid
          ? "border-[var(--rm-accent)] bg-[var(--rm-row-hl)]"
          : "border-[var(--rm-border)] bg-[var(--rm-card-bg)]"
      }`}
    >
      <div className="w-16 shrink-0 text-[11px] leading-tight text-[var(--rm-muted)]">
        <div className="font-bold capitalize text-[var(--rm-text)]">
          {formatMadridDate(match.startsAt)}
        </div>
        <div>{formatMadridTime(match.startsAt)}</div>
      </div>
      <div className="grid flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1.5 text-[13px] font-semibold">
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate text-[var(--rm-text)]">{match.home}</span>
          <TeamLogo src={match.homeLogo} alt={match.home} size={22} />
        </div>
        <div className="shrink-0 whitespace-nowrap rounded bg-[var(--rm-score-bg)] px-2 py-0.5 text-xs font-black text-[var(--rm-score-text)]">
          {showScore
            ? `${match.homeScore} - ${match.awayScore}`
            : match.status === "live"
              ? "LIVE"
              : "vs"}
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          <TeamLogo src={match.awayLogo} alt={match.away} size={22} />
          <span className="truncate text-[var(--rm-text)]">{match.away}</span>
        </div>
      </div>
    </div>
  );
}
