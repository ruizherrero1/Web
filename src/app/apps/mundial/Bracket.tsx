"use client";

import { TeamLabel } from "./components";
import {
  SPAIN_TEAM,
  formatMadridDate,
  formatMadridTime,
  isTeamMatch,
  liveMinuteLabel,
  penaltyWinnerLabel,
  roundLabels,
} from "./helpers";
import type { EnrichedMatch } from "./types";

type Round = { round: string; matches: EnrichedMatch[] };

function isThirdPlace(round: string) {
  return /third/i.test(round);
}

export function KnockoutBracket({ rounds }: { rounds: Round[] }) {
  const mainRounds = rounds.filter((round) => !isThirdPlace(round.round));
  const thirdPlace = rounds.find((round) => isThirdPlace(round.round));
  if (!mainRounds.length) return null;

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-stretch gap-4">
        {mainRounds.map((round, index) => {
          const isLast = index === mainRounds.length - 1;
          return (
            <div key={round.round} className="flex w-52 flex-col">
              <h3 className="mb-3 text-center text-[11px] font-black uppercase tracking-[0.12em] text-[var(--wc-muted)]">
                {roundLabels[round.round] ?? round.round}
              </h3>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {round.matches.map((match) => (
                  <BracketMatch key={match.id} match={match} />
                ))}
                {isLast && thirdPlace ? (
                  <div className="mt-2">
                    <h4 className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[var(--wc-muted)]">
                      {roundLabels[thirdPlace.round] ?? thirdPlace.round}
                    </h4>
                    {thirdPlace.matches.map((match) => (
                      <BracketMatch key={match.id} match={match} />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BracketMatch({ match }: { match: EnrichedMatch }) {
  const fullTime = match.score?.ft;
  const penalties = match.score?.p;
  // Ganador para resaltar: por penaltis si los hubo, si no por el resultado.
  const decider = penalties ?? fullTime;
  const winnerIndex =
    match.status === "finished" && decider
      ? decider[0] > decider[1] ? 0 : decider[1] > decider[0] ? 1 : -1
      : -1;
  const isSpain = isTeamMatch(match, SPAIN_TEAM);
  const isLive = match.status === "live";
  const penaltyWinner = penaltyWinnerLabel(match);

  return (
    <article
      className={`rounded-lg border bg-[var(--wc-card-bg)] p-2.5 shadow-sm transition hover:border-[var(--wc-accent)] ${
        isSpain || isLive ? "border-[var(--wc-accent)]" : "border-[var(--wc-border)]"
      }`}
    >
      <p className="mb-1.5 flex items-center justify-between text-[10px] text-[var(--wc-muted)]">
        <span className="capitalize">
          {formatMadridDate(match.startsAt)} · {formatMadridTime(match.startsAt)}
        </span>
        {isLive ? (
          <span className="font-black uppercase text-red-500">
            Live {liveMinuteLabel(match)}
          </span>
        ) : null}
      </p>
      <BracketTeamRow
        team={match.team1}
        goals={fullTime?.[0]}
        penalties={penalties?.[0]}
        winner={winnerIndex === 0}
      />
      <BracketTeamRow
        team={match.team2}
        goals={fullTime?.[1]}
        penalties={penalties?.[1]}
        winner={winnerIndex === 1}
      />
      {penaltyWinner ? (
        <p className="mt-1.5 truncate text-center text-[9px] font-black uppercase tracking-[0.06em] text-[var(--wc-score-text)]">
          {penaltyWinner}
        </p>
      ) : null}
    </article>
  );
}

function BracketTeamRow({
  team,
  goals,
  penalties,
  winner,
}: {
  team: string;
  goals?: number;
  penalties?: number;
  winner: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 py-0.5 text-xs ${
        winner ? "font-black text-[var(--wc-text)]" : "font-semibold text-[var(--wc-muted)]"
      }`}
    >
      <TeamLabel team={team} compact />
      <span
        className={`inline-flex min-w-6 shrink-0 items-center justify-center rounded px-1 text-[11px] font-black ${
          winner
            ? "bg-[var(--wc-score-bg)] text-[var(--wc-score-text)]"
            : "text-[var(--wc-muted)]"
        }`}
      >
        {typeof goals === "number" ? goals : "–"}
        {typeof penalties === "number" ? (
          <span className="ml-0.5 text-[9px] font-bold">({penalties})</span>
        ) : null}
      </span>
    </div>
  );
}
