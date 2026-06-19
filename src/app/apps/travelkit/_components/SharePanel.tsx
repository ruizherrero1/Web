"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { KitMember } from "@/lib/supabase/types";
import { Users, UserPlus, X, Loader2, Crown, LogOut } from "lucide-react";

type SharePanelProps = {
  kitId: string;
  isOwner: boolean;
  currentUserId: string;
};

const SHARE_MESSAGES: Record<string, string> = {
  ok: "",
  not_owner: "Solo el propietario puede compartir este viaje.",
  user_not_found: "No hay ningún usuario registrado con ese correo.",
  self: "Ese viaje ya es tuyo.",
};

export function SharePanel({ kitId, isOwner, currentUserId }: SharePanelProps) {
  const router = useRouter();
  const [members, setMembers] = useState<KitMember[]>([]);
  const [email, setEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const fetchMembers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("get_kit_members", { _kit_id: kitId });
    if (data) setMembers(data as KitMember[]);
  }, [kitId]);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchMembers(), 0);
    return () => window.clearTimeout(id);
  }, [fetchMembers]);

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSharing(true);
    setFeedback(null);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("share_kit", {
      _kit_id: kitId,
      _email: email.trim(),
    });

    if (error) {
      setFeedback({ kind: "error", text: "No se pudo compartir. Inténtalo de nuevo." });
    } else if (data === "ok") {
      setFeedback({ kind: "ok", text: `Compartido con ${email.trim()}.` });
      setEmail("");
      await fetchMembers();
    } else {
      setFeedback({ kind: "error", text: SHARE_MESSAGES[data as string] ?? "No se pudo compartir." });
    }
    setSharing(false);
  }

  async function removeMember(userId: string) {
    const supabase = createClient();
    await supabase.from("travel_kit_members").delete().eq("kit_id", kitId).eq("user_id", userId);
    await fetchMembers();
  }

  async function leaveKit() {
    if (!confirm("¿Salir de este viaje? Dejarás de tener acceso.")) return;
    const supabase = createClient();
    await supabase
      .from("travel_kit_members")
      .delete()
      .eq("kit_id", kitId)
      .eq("user_id", currentUserId);
    router.push("/apps/travelkit");
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users className="size-4 text-[var(--accent-dark)]" />
        <h2 className="text-base font-bold text-[var(--ink)]">
          {isOwner ? "Compartir viaje" : "Compartido"}
        </h2>
      </div>

      {/* Lista de miembros */}
      <ul className="space-y-2 mb-4">
        {members.map((m) => (
          <li key={m.user_id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate text-[var(--ink)]">{m.email}</span>
            {m.role === "owner" ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-dark)]">
                <Crown className="size-3" />
                Propietario
              </span>
            ) : (
              <span className="text-xs text-[var(--muted)]">Editor</span>
            )}
            {isOwner && m.role !== "owner" && (
              <button
                onClick={() => removeMember(m.user_id)}
                aria-label={`Quitar a ${m.email}`}
                className="text-[var(--muted)] hover:text-red-500 transition"
              >
                <X className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Compartir (solo propietario) */}
      {isOwner ? (
        <form onSubmit={handleShare} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="flex-1 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={sharing || !email.trim()}
              className="focus-ring inline-flex items-center gap-2 rounded-md bg-[var(--accent-strong)] px-3 py-2 text-sm font-semibold text-[var(--on-accent)] transition hover:bg-[var(--accent)] disabled:opacity-50"
            >
              {sharing ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Compartir
            </button>
          </div>
          <p className="text-xs text-[var(--muted)]">
            La persona debe tener una cuenta. Verá y podrá editar este viaje.
          </p>
          {feedback && (
            <p
              className={`text-sm ${
                feedback.kind === "ok"
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {feedback.text}
            </p>
          )}
        </form>
      ) : (
        <button
          onClick={leaveKit}
          className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--line)] px-3 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-red-300 hover:text-red-500"
        >
          <LogOut className="size-4" />
          Salir del viaje
        </button>
      )}
    </section>
  );
}
