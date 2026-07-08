"use client";

import { useEffect, useRef, useState } from "react";
import { Tv } from "lucide-react";
import { Badge } from "@/components/Badge";
import { getBroadcastChannels } from "./broadcast";
import {
  formatMadridDate,
  formatMadridTime,
  getTeamInfo,
  groupShortName,
  liveMinuteLabel,
  matchScoreLabel,
  penaltyWinnerLabel,
  roundLabels,
} from "./helpers";
import { GROUP_COLORS, themeConfigs } from "./theme";
import type { EnrichedMatch, Scorer, Standing, ThemeId } from "./types";

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

export function BroadcastButton({ match }: { match: EnrichedMatch }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        title="Dónde verlo en España"
        aria-label={`Dónde ver ${match.team1} contra ${match.team2} en España`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="focus-ring inline-flex min-h-7 items-center justify-center rounded-md border border-[var(--wc-border)] bg-[var(--wc-panel-bg)] px-2 py-1 text-[var(--wc-muted)] transition hover:border-[var(--wc-accent)] hover:text-[var(--wc-accent)]"
      >
        <Tv className="size-3.5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] p-3 text-left shadow-xl shadow-black/30">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--wc-muted)]">
            Dónde verlo (España)
          </p>
          <ul className="space-y-2">
            {getBroadcastChannels(match).map((channel) => (
              <li key={channel.name}>
                <a
                  href={channel.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`focus-ring block rounded-md px-2 py-1.5 transition hover:bg-[var(--wc-panel-bg)] ${channel.unconfirmed ? "opacity-70" : ""}`}
                >
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--wc-text)]">
                    {channel.name}
                    {channel.free ? (
                      <span className="rounded bg-[var(--wc-score-bg)] px-1.5 py-0.5 text-[9px] font-black uppercase text-[var(--wc-score-text)]">
                        Gratis
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-[var(--wc-muted)]">
                    {channel.detail}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </span>
  );
}

export function LiveBadge({ minute }: { minute?: string }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-red-500">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.85)]" />
      Live{minute ? ` · ${minute}` : ""}
    </span>
  );
}

function PenaltyWinnerNote({ label }: { label: string }) {
  return (
    <p className="mx-auto mt-2 inline-flex max-w-full items-center rounded-md border border-[var(--wc-border)] bg-[var(--wc-panel-bg)] px-2 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-[var(--wc-score-text)]">
      <span className="truncate">{label}</span>
    </p>
  );
}
export function ScorersTable({ scorers }: { scorers: Scorer[] }) {
  // Los datos de ESPN no traen asistencias: ocultamos columnas sin datos.
  const hasAssists = scorers.some((scorer) => scorer.assists > 0);
  const hasPenalties = scorers.some((scorer) => scorer.penalties > 0);

  return (
    <article className="overflow-hidden rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] shadow-sm">
      <div className="flex items-center justify-between border-b border-[var(--wc-border)] bg-[var(--wc-card-header)] px-4 py-3 text-white">
        <h2 className="text-lg font-bold">Máximos goleadores</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="bg-[var(--wc-panel-bg)] text-left text-[10px] uppercase tracking-[0.08em] text-[var(--wc-muted)] sm:text-xs sm:tracking-[0.1em]">
            <tr>
              <th className="px-2 py-2 sm:px-4 sm:py-3">Jugador</th>
              <th className="px-2 py-2 sm:px-4 sm:py-3">Selección</th>
              <th className="px-1.5 py-2 text-center sm:px-3 sm:py-3">Goles</th>
              {hasPenalties ? (
                <th className="hidden px-3 py-3 text-center sm:table-cell">Penaltis</th>
              ) : null}
              {hasAssists ? (
                <th className="hidden px-3 py-3 text-center sm:table-cell">Asist.</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--wc-border-inner)]">
            {scorers.map((scorer, index) => (
              <tr key={`${scorer.name}-${scorer.team}`} className={index < 3 ? "bg-[var(--wc-row-hl)]" : undefined}>
                <td className="min-w-0 px-2 py-2 font-bold text-[var(--wc-text)] sm:px-4 sm:py-3">
                  <span className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded bg-[var(--wc-panel-bg)] text-[10px] text-[var(--wc-muted)] sm:mr-2 sm:h-6 sm:w-6 sm:text-xs">
                    {index + 1}
                  </span>
                  {scorer.name}
                </td>
                <td className="px-2 py-2 text-[var(--wc-muted)] sm:px-4 sm:py-3">
                  <TeamLabel team={scorer.team} compact />
                </td>
                <td className="px-1.5 py-2 text-center text-sm font-black text-[var(--wc-accent)] sm:px-3 sm:py-3 sm:text-base">
                  {scorer.goals}
                </td>
                {hasPenalties ? (
                  <td className="hidden px-3 py-3 text-center text-[var(--wc-muted)] sm:table-cell">
                    {scorer.penalties}
                  </td>
                ) : null}
                {hasAssists ? (
                  <td className="hidden px-3 py-3 text-center text-[var(--wc-muted)] sm:table-cell">
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

function GoalsPanel({ match }: { match: EnrichedMatch }) {
  const goals = match.goals ?? [];
  const leftGoals = goals.filter((g) => g.team === match.team1);
  const rightGoals = goals.filter((g) => g.team === match.team2);

  return (
    <div className="mt-2 border-t border-[var(--wc-border-inner)] pt-2">
      <div className="grid grid-cols-[1fr_1px_1fr] gap-x-2 text-[11px]">
        <div className="space-y-0.5 text-right">
          {leftGoals.map((g, i) => (
            <div key={i} className="text-[var(--wc-text)]">
              <span className="mr-0.5 text-[var(--wc-muted)]">{g.scorer}</span>
              {g.ownGoal ? <span className="text-[var(--wc-muted)]"> (p.p.)</span> : g.penalty ? <span className="text-[var(--wc-muted)]"> (p.)</span> : null}
              <span className="ml-1 font-bold text-[var(--wc-accent)]">{g.minute}</span>
            </div>
          ))}
        </div>
        <div className="bg-[var(--wc-border-inner)]" />
        <div className="space-y-0.5">
          {rightGoals.map((g, i) => (
            <div key={i} className="text-[var(--wc-text)]">
              <span className="mr-1 font-bold text-[var(--wc-accent)]">{g.minute}</span>
              <span className="text-[var(--wc-muted)]">{g.scorer}</span>
              {g.ownGoal ? <span className="text-[var(--wc-muted)]"> (p.p.)</span> : g.penalty ? <span className="text-[var(--wc-muted)]"> (p.)</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MatchRow({ match, domId }: { match: EnrichedMatch; domId?: string }) {
  const score = matchScoreLabel(match);
  const penaltyWinner = penaltyWinnerLabel(match);
  const hasGoals = (match.goals?.length ?? 0) > 0;
  const canExpand = hasGoals && (match.status === "live" || match.status === "finished");
  const [expanded, setExpanded] = useState(false);

  return (
    <article
      id={domId}
      className={`rounded-lg border border-[var(--wc-border)] bg-[var(--wc-card-bg)] p-3 shadow-sm transition hover:border-[var(--wc-accent)] ${canExpand ? "cursor-pointer select-none" : ""}`}
      onClick={canExpand ? () => setExpanded((v) => !v) : undefined}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-x-2">
          <span className="font-bold capitalize text-[var(--wc-text)]">
            {formatMadridDate(match.startsAt)}
          </span>
          <span className="text-[var(--wc-muted)]">·</span>
          <span className="text-[var(--wc-muted)]">{formatMadridTime(match.startsAt)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {match.status === "live" ? <LiveBadge minute={liveMinuteLabel(match)} /> : null}
          <GroupBadge group={match.group} />
          <BroadcastButton match={match} />
          {canExpand ? (
            <span className={`text-[var(--wc-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5l5 5 5-5" />
              </svg>
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <div className="min-w-0 text-right text-[13px] font-bold text-[var(--wc-text)] sm:text-sm">
          <TeamLabel team={match.team1} align="right" />
        </div>
        <div className="shrink-0 whitespace-nowrap rounded bg-[var(--wc-score-bg)] px-2 py-1 text-xs font-black text-[var(--wc-score-text)] sm:px-2.5">
          {score}
        </div>
        <div className="min-w-0 text-[13px] font-bold text-[var(--wc-text)] sm:text-sm">
          <TeamLabel team={match.team2} />
        </div>
      </div>
      {penaltyWinner ? (
        <div className="text-center">
          <PenaltyWinnerNote label={penaltyWinner} />
        </div>
      ) : null}
      {match.ground ? (
        <p className="mt-1.5 text-center text-xs text-[var(--wc-muted)]">{match.ground}</p>
      ) : null}
      {expanded && hasGoals ? <GoalsPanel match={match} /> : null}
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
  const penaltyWinner = penaltyWinnerLabel(match);
  const hasGoals = (match.goals?.length ?? 0) > 0;
  const canExpand = hasGoals && (match.status === "live" || match.status === "finished");
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`px-4 py-3 ${canExpand ? "cursor-pointer select-none" : ""}`}
      onClick={canExpand ? () => setExpanded((v) => !v) : undefined}
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-[var(--wc-muted)]">
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
        {match.status === "live" ? <LiveBadge minute={liveMinuteLabel(match)} /> : null}
        <span className="ml-auto flex items-center gap-1">
          <BroadcastButton match={match} />
          {canExpand ? (
            <span className={`text-[var(--wc-muted)] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.5l5 5 5-5" />
              </svg>
            </span>
          ) : null}
        </span>
      </div>
      <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
        <div className="min-w-0 text-right text-[11px] font-bold text-[var(--wc-text)] sm:text-xs">
          <TeamLabel team={match.team1} compact align="right" />
        </div>
        <div className="shrink-0 whitespace-nowrap rounded bg-[var(--wc-score-bg)] px-1.5 py-1 text-[11px] font-black text-[var(--wc-score-text)] sm:px-2 sm:text-xs">
          {score}
        </div>
        <div className="min-w-0 text-[11px] font-bold text-[var(--wc-text)] sm:text-xs">
          <TeamLabel team={match.team2} compact />
        </div>
      </div>
      {penaltyWinner ? (
        <div className="text-center">
          <PenaltyWinnerNote label={penaltyWinner} />
        </div>
      ) : null}
      {expanded && hasGoals ? <GoalsPanel match={match} /> : null}
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
