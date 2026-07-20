"use client";

import { COMP_COLORS, formatMadridDate, formatMadridTime, isMadrid, scoreLabel } from "./helpers";
import { themeConfigs } from "./theme";
import type { CompId, MadridMatch, Scorer, SquadPlayer, StandingRow, ThemeId } from "./types";

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

function TeamLogo({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return <span className="inline-block h-5 w-5 shrink-0 rounded-full bg-[var(--rm-panel-bg)]" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={20} height={20} className="h-5 w-5 shrink-0 object-contain" />;
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
  return (
    <article
      id={domId}
      className="rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] p-3 shadow-sm transition hover:border-[var(--rm-accent)]"
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
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <div className="flex min-w-0 items-center justify-end gap-1.5 text-[13px] font-bold sm:text-sm">
          <TeamName name={match.home} align="right" />
          <TeamLogo src={match.homeLogo} alt={match.home} />
        </div>
        <div className="shrink-0 whitespace-nowrap rounded bg-[var(--rm-score-bg)] px-2 py-1 text-xs font-black text-[var(--rm-score-text)] sm:px-2.5">
          {score}
        </div>
        <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold sm:text-sm">
          <TeamLogo src={match.awayLogo} alt={match.away} />
          <TeamName name={match.away} />
        </div>
      </div>
      {match.round ? (
        <p className="mt-1.5 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--rm-muted)]">
          {match.round}
        </p>
      ) : null}
      {match.venue ? (
        <p className="mt-1 text-center text-xs text-[var(--rm-muted)]">{match.venue}</p>
      ) : null}
    </article>
  );
}

export function StandingsTable({ rows }: { rows: StandingRow[] }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--rm-border)] bg-[var(--rm-card-header)] px-4 py-3 text-white">
        <h2 className="text-lg font-bold">Clasificación · LaLiga</h2>
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

export function SquadList({ players }: { players: SquadPlayer[] }) {
  const groups = POSITION_ORDER.map((group) => ({
    group,
    players: players
      .filter((player) => player.position === group)
      .sort((a, b) => (a.number ?? 99) - (b.number ?? 99)),
  })).filter((entry) => entry.players.length > 0);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map((entry) => (
        <article
          key={entry.group}
          className="overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] shadow-sm"
        >
          <div className="border-b border-[var(--rm-border)] bg-[var(--rm-card-header)] px-4 py-3 text-white">
            <h3 className="text-base font-bold">{entry.group}</h3>
          </div>
          <ul className="divide-y divide-[var(--rm-border-inner)]">
            {entry.players.map((player) => (
              <li
                key={`${player.name}-${player.number ?? ""}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm"
              >
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--rm-panel-bg)] text-xs font-black text-[var(--rm-accent)]">
                  {player.number ?? "—"}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-[var(--rm-text)]">
                  {player.name}
                </span>
                {player.age ? (
                  <span className="shrink-0 text-xs text-[var(--rm-muted)]">{player.age} a.</span>
                ) : null}
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

export function ScorersTable({ scorers }: { scorers: Scorer[] }) {
  const hasAssists = scorers.some((scorer) => scorer.assists > 0);
  const hasPenalties = scorers.some((scorer) => scorer.penalties > 0);
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--rm-border)] bg-[var(--rm-card-bg)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--rm-border)] bg-[var(--rm-card-header)] px-4 py-3 text-white">
        <h2 className="text-lg font-bold">Goleadores del Madrid</h2>
        <span className="text-xs font-semibold text-white/70">en LaLiga</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-[var(--rm-panel-bg)] text-left text-[10px] uppercase tracking-[0.08em] text-[var(--rm-muted)] sm:text-xs">
            <tr>
              <th className="px-2 py-2 sm:px-4 sm:py-3">Jugador</th>
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
              <tr key={scorer.name} className={index < 3 ? "bg-[var(--rm-row-hl)]" : undefined}>
                <td className="min-w-0 px-2 py-2 font-bold text-[var(--rm-text)] sm:px-4 sm:py-3">
                  <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--rm-panel-bg)] text-[10px] text-[var(--rm-muted)] sm:mr-2 sm:h-6 sm:w-6 sm:text-xs">
                    {index + 1}
                  </span>
                  {scorer.name}
                </td>
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
