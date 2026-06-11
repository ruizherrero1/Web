"use client";

import { Badge } from "@/components/Badge";
import {
  formatMadridDate,
  formatMadridTime,
  getTeamInfo,
  groupShortName,
  matchScoreLabel,
  roundLabels,
} from "./helpers";
import { GROUP_COLORS, themeConfigs } from "./theme";
import type { EnrichedMatch, Standing, ThemeId } from "./types";

export function FlagImg({ code, name }: { code: string; name: string }) {
  return (
    <img
      src={`https://flagcdn.com/20x15/${code}.png`}
      srcSet={`https://flagcdn.com/40x30/${code}.png 2x`}
      width={20}
      height={15}
      alt={`Bandera de ${name}`}
      className="shrink-0 rounded-[1px] object-cover"
    />
  );
}

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
          onClick={() => onThemeChange(id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
            activeTheme === id
              ? themeConfigs[id].activeClass
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full border border-white/30"
            style={{ background: themeConfigs[id].swatch }}
          />
          {themeConfigs[id].label}
        </button>
      ))}
    </div>
  );
}

export function SpainFilterButton({
  active,
  compact = false,
  onClick,
}: {
  active: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={active ? "Mostrar todos los partidos" : "Ver partidos de España"}
      aria-pressed={active}
      onClick={onClick}
      className={`focus-ring inline-flex min-h-9 shrink-0 items-center justify-center gap-2 rounded-md text-sm font-bold transition ${
        active
          ? "bg-[var(--wc-accent)] text-[var(--wc-accent-fg)]"
          : "bg-[var(--wc-panel-bg)] text-[var(--wc-muted)] hover:text-[var(--wc-text)]"
      } ${compact ? "w-10 px-2" : "px-3"}`}
    >
      <FlagImg code="es" name="España" />
      {compact ? <span className="sr-only">España</span> : <span>España</span>}
    </button>
  );
}

export function TeamLabel({
  team,
  compact = false,
  align = "left",
}: {
  team: string;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const info = getTeamInfo(team);

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap ${
        align === "right" ? "justify-end" : ""
      }`}
    >
      {info.countryCode ? (
        <img
          src={`https://flagcdn.com/20x15/${info.countryCode}.png`}
          srcSet={`https://flagcdn.com/40x30/${info.countryCode}.png 2x`}
          width={compact ? 16 : 20}
          height={compact ? 12 : 15}
          alt={`Bandera de ${info.name}`}
          className="shrink-0 rounded-[1px] object-cover"
        />
      ) : null}
      <span className="min-w-0 truncate">{info.name}</span>
    </span>
  );
}

export function GroupBadge({ group }: { group?: string }) {
  const label = groupShortName(group);
  const letter = group?.split(" ").pop() ?? "";
  const colors = GROUP_COLORS[letter];
  return (
    <span
      className="inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-bold"
      style={
        colors
          ? { background: colors.bg, color: colors.color, borderColor: "transparent" }
          : { background: "var(--wc-panel-bg)", color: "var(--wc-muted)", borderColor: "transparent" }
      }
    >
      {label}
    </span>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-500">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]" />
      Live
    </span>
  );
}

export function MatchRow({ match }: { match: EnrichedMatch }) {
  const score = matchScoreLabel(match);

  return (
    <article className="rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] p-3 shadow-sm transition hover:border-[var(--wc-accent)]">
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-x-2">
          <span className="font-bold capitalize text-[var(--wc-text)]">
            {formatMadridDate(match.startsAt)}
          </span>
          <span className="text-[var(--wc-muted)]">·</span>
          <span className="text-[var(--wc-muted)]">{formatMadridTime(match.startsAt)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {match.status === "live" ? <LiveBadge /> : null}
          <GroupBadge group={match.group} />
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <div className="min-w-0 text-right text-[13px] font-bold text-[var(--wc-text)] sm:text-sm">
          <TeamLabel team={match.team1} align="right" />
        </div>
        <div className="shrink-0 rounded bg-[var(--wc-score-bg)] px-2 py-1 text-xs font-black text-[var(--wc-score-text)] sm:px-2.5">
          {score}
        </div>
        <div className="min-w-0 text-[13px] font-bold text-[var(--wc-text)] sm:text-sm">
          <TeamLabel team={match.team2} />
        </div>
      </div>
      {match.ground ? (
        <p className="mt-1.5 text-center text-xs text-[var(--wc-muted)]">{match.ground}</p>
      ) : null}
    </article>
  );
}

export function GroupFixtureCard({
  group,
  teams,
  matches,
}: {
  group: string;
  teams: string[];
  matches: EnrichedMatch[];
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] shadow-sm">
      <div className="border-b border-[var(--wc-border)] bg-[var(--wc-card-header)] px-4 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{groupShortName(group)}</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {teams.map((team) => (
            <div
              key={team}
              className="min-w-0 rounded-md border border-white/15 bg-white/[0.08] px-2.5 py-2 text-xs font-semibold sm:px-3 sm:text-sm"
            >
              <TeamLabel team={team} compact />
            </div>
          ))}
        </div>
      </div>

      <div className="divide-y divide-[var(--wc-border-inner)]">
        {matches.map((match) => (
          <MiniMatchRow key={match.id} match={match} />
        ))}
      </div>
    </article>
  );
}

export function KnockoutRoundCard({
  round,
  matches,
}: {
  round: string;
  matches: EnrichedMatch[];
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] shadow-sm">
      <div className="border-b border-[var(--wc-border)] bg-[var(--wc-card-header)] px-4 py-4 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold">{roundLabels[round] ?? round}</h3>
          <Badge>{`${matches.length} ${matches.length === 1 ? "partido" : "partidos"}`}</Badge>
        </div>
      </div>
      <div className="divide-y divide-[var(--wc-border-inner)]">
        {matches.map((match) => (
          <MiniMatchRow key={match.id} match={match} />
        ))}
      </div>
    </article>
  );
}

export function MiniMatchRow({ match }: { match: EnrichedMatch }) {
  const score = matchScoreLabel(match);

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-[var(--wc-muted)]">
        <span className="font-semibold capitalize text-[var(--wc-text)]">
          {formatMadridDate(match.startsAt)}
        </span>
        <span>·</span>
        <span>{formatMadridTime(match.startsAt)}</span>
        {match.ground ? (
          <>
            <span>·</span>
            <span>{match.ground}</span>
          </>
        ) : null}
        {match.status === "live" ? <LiveBadge /> : null}
      </div>
      <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <div className="min-w-0 text-right text-[11px] font-bold text-[var(--wc-text)] sm:text-xs">
          <TeamLabel team={match.team1} compact align="right" />
        </div>
        <div className="shrink-0 rounded bg-[var(--wc-score-bg)] px-1.5 py-1 text-[11px] font-black text-[var(--wc-score-text)] sm:px-2 sm:text-xs">
          {score}
        </div>
        <div className="min-w-0 text-[11px] font-bold text-[var(--wc-text)] sm:text-xs">
          <TeamLabel team={match.team2} compact />
        </div>
      </div>
    </div>
  );
}

export function GroupTable({ group, teams }: { group: string; teams: Standing[] }) {
  return (
    <article className="overflow-hidden rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--wc-border)] bg-[var(--wc-card-header)] px-4 py-3 text-white">
        <h2 className="text-lg font-bold">{groupShortName(group)}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-[var(--wc-panel-bg)] text-left text-[10px] uppercase tracking-[0.08em] text-[var(--wc-muted)] sm:text-xs sm:tracking-[0.1em]">
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
          <tbody className="divide-y divide-[var(--wc-border-inner)]">
            {teams.map((team, index) => (
              <tr key={team.team} className={index < 2 ? "bg-[var(--wc-row-hl)]" : undefined}>
                <td className="min-w-0 px-2 py-2 font-bold text-[var(--wc-text)] sm:px-4 sm:py-3">
                  <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--wc-panel-bg)] text-[10px] text-[var(--wc-muted)] sm:mr-2 sm:h-6 sm:w-6 sm:text-xs">
                    {index + 1}
                  </span>
                  <TeamLabel team={team.team} compact />
                </td>
                <Cell>{team.played}</Cell>
                <Cell>{team.wins}</Cell>
                <Cell>{team.draws}</Cell>
                <Cell>{team.losses}</Cell>
                <HiddenCell>{team.goalsFor}</HiddenCell>
                <HiddenCell>{team.goalsAgainst}</HiddenCell>
                <Cell>{team.goalDifference}</Cell>
                <td className="px-2 py-2 text-center text-sm font-black text-[var(--wc-accent)] sm:px-4 sm:py-3 sm:text-base">
                  {team.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="px-1.5 py-2 text-center text-[var(--wc-muted)] sm:px-3 sm:py-3">{children}</td>;
}

function HiddenCell({ children }: { children: React.ReactNode }) {
  return <td className="hidden px-3 py-3 text-center text-[var(--wc-muted)] sm:table-cell">{children}</td>;
}
