import Link from "next/link";
import type { AppItem } from "@/data/apps";
import { Badge } from "@/components/Badge";
import { BarChart2, ChefHat, Clapperboard, Dumbbell, Plane, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const appIcons: Record<string, LucideIcon> = {
  gym: Dumbbell,
  fantasy: Trophy,
  recetas: ChefHat,
  travelkit: Plane,
  cine: Clapperboard,
  financelab: BarChart2,
};

type AppCardProps = Pick<
  AppItem,
  "name" | "description" | "status" | "access" | "href" | "focus" | "slug"
>;

export function AppCard({
  name,
  description,
  status,
  access,
  href,
  focus,
  slug,
}: AppCardProps) {
  const Icon = appIcons[slug];

  return (
    <article className="flex min-h-64 flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md">
      <div>
        {Icon && (
          <div className="mb-5 inline-flex size-10 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <Icon className="size-5 text-[var(--accent-dark)]" />
          </div>
        )}
        <div className="mb-4 flex flex-wrap gap-2">
          <Badge tone="status">{status}</Badge>
          <Badge tone="access">{access}</Badge>
        </div>
        <p className="text-sm font-semibold text-[var(--accent-dark)]">{focus}</p>
        <h3 className="mt-2 text-2xl font-bold text-[var(--ink)]">{name}</h3>
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      <Link
        className="focus-ring mt-8 inline-flex w-fit items-center rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
        href={href}
      >
        Ver detalle
      </Link>
    </article>
  );
}

