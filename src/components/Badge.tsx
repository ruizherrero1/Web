import type { AppAccess, AppStatus } from "@/data/apps";

type BadgeProps = {
  children: AppAccess | AppStatus | string;
  tone?: "status" | "access" | "neutral";
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  const toneClass =
    tone === "status"
      ? "border-emerald-800/20 bg-[rgba(6,95,70,0.08)] text-emerald-950"
      : tone === "access"
        ? "border-cyan-900/20 bg-[rgba(22,78,99,0.08)] text-cyan-950"
        : "border-[rgba(24,24,27,0.12)] bg-white text-zinc-700";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </span>
  );
}
