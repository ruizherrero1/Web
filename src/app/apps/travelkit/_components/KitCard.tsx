"use client";

import Link from "next/link";
import type { TravelKit } from "@/lib/supabase/types";
import { MapPin, Copy, Trash2, Loader2, Plane, Layout, Users, LogOut } from "lucide-react";

type KitCardProps = {
  kit: TravelKit;
  isTemplate?: boolean;
  isOwner?: boolean;
  onDelete: () => void;
  onClone?: () => void;
  cloning?: boolean;
};

export function KitCard({ kit, isTemplate, isOwner = true, onDelete, onClone, cloning }: KitCardProps) {
  const shared = !isTemplate && !isOwner;

  function confirmDelete() {
    if (shared) {
      if (confirm(`¿Salir del viaje "${kit.title}"? Dejarás de tener acceso.`)) onDelete();
    } else if (confirm(`¿Eliminar "${kit.title}"?`)) {
      onDelete();
    }
  }

  return (
    <article className="flex flex-col justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md">
      <div>
        <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
          {isTemplate ? (
            <Layout className="size-4 text-[var(--accent-dark)]" />
          ) : (
            <Plane className="size-4 text-[var(--accent-dark)]" />
          )}
        </div>
        <h3 className="text-lg font-bold text-[var(--ink)] leading-snug">{kit.title}</h3>
        {kit.destination && (
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-[var(--muted)]">
            <MapPin className="size-3.5 shrink-0" />
            {kit.destination}
          </p>
        )}
        {shared && (
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--badge-access-border)] bg-[var(--badge-access-bg)] px-2 py-1 text-xs font-semibold text-[var(--badge-access-fg)]">
            <Users className="size-3" />
            Compartido contigo
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-5">
        {isTemplate ? (
          <button
            onClick={onClone}
            disabled={cloning}
            className="focus-ring flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)] disabled:opacity-50"
          >
            {cloning ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
            Usar plantilla
          </button>
        ) : (
          <Link
            href={`/apps/travelkit/${kit.id}`}
            className="focus-ring flex-1 inline-flex items-center justify-center rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
          >
            Abrir
          </Link>
        )}
        <button
          onClick={confirmDelete}
          aria-label={shared ? "Salir del viaje" : "Eliminar"}
          title={shared ? "Salir del viaje" : "Eliminar"}
          className="focus-ring inline-flex items-center justify-center rounded-md border border-[var(--line)] p-2 text-[var(--muted)] transition hover:border-red-300 hover:text-red-500"
        >
          {shared ? <LogOut className="size-4" /> : <Trash2 className="size-4" />}
        </button>
      </div>
    </article>
  );
}
