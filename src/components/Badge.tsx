import type { AppAccess, AppStatus } from "@/data/apps";

type BadgeProps = {
  children: AppAccess | AppStatus | string;
  tone?: "status" | "access" | "neutral";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const toneClass =
    tone === "status"
      ? "border-[var(--badge-status-border)] bg-[var(--badge-status-bg)] text-[var(--badge-status-fg)]"
      : tone === "access"
        ? "border-[var(--badge-access-border)] bg-[var(--badge-access-bg)] text-[var(--badge-access-fg)]"
        : "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)]";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}
