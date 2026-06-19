"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TravelKit } from "@/lib/supabase/types";
import type { ChecklistItem } from "@/lib/supabase/types";
import { KitCard } from "./KitCard";
import { Plus, Loader2, LogOut } from "lucide-react";
import { clearTravelKitOfflineData } from "@/lib/travelkit/offline";

type KitsGridProps = {
  kits: TravelKit[];
  templates: TravelKit[];
  currentUserId: string;
  onRefresh: () => Promise<void>;
};

export function KitsGrid({ kits, templates, currentUserId, onRefresh }: KitsGridProps) {
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDestination, setNewDestination] = useState("");
  const [creating, setCreating] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);

  async function handleCreate(isTemplate = false) {
    if (!newTitle.trim()) return;
    setCreating(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("travel_kits").insert({
      user_id: user.id,
      title: newTitle.trim(),
      destination: newDestination.trim() || null,
      is_template: isTemplate,
    });

    setNewTitle("");
    setNewDestination("");
    setShowNewForm(false);
    setCreating(false);
    await onRefresh();
  }

  async function handleClone(templateId: string) {
    setCloningId(templateId);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const { data: newKit } = await supabase
      .from("travel_kits")
      .insert({
        user_id: user.id,
        title: `${template.title} (copia)`,
        destination: template.destination,
        is_template: false,
      })
      .select()
      .single();

    if (newKit) {
      const { data: sections } = await supabase
        .from("checklist_sections")
        .select("*, checklist_items(*)")
        .eq("kit_id", templateId)
        .order("position");

      if (sections) {
        for (const section of sections) {
          const { data: newSection } = await supabase
            .from("checklist_sections")
            .insert({ kit_id: newKit.id, title: section.title, position: section.position })
            .select()
            .single();

          const items: ChecklistItem[] = section.checklist_items ?? [];
          if (newSection && items.length > 0) {
            await supabase.from("checklist_items").insert(
              items.map((item) => ({
                section_id: newSection.id,
                label: item.label,
                checked: false,
                position: item.position,
              }))
            );
          }
        }
      }
    }

    setCloningId(null);
    await onRefresh();
  }

  async function handleDelete(kit: TravelKit) {
    const supabase = createClient();
    if (kit.user_id === currentUserId) {
      // Propietario: borra el viaje entero (cascada)
      await supabase.from("travel_kits").delete().eq("id", kit.id);
    } else {
      // Miembro invitado: solo se sale del viaje (borra su membresía)
      await supabase
        .from("travel_kit_members")
        .delete()
        .eq("kit_id", kit.id)
        .eq("user_id", currentUserId);
    }
    await onRefresh();
  }

  async function handleSignOut() {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } finally {
      // No dejar datos privados de viajes accesibles en el dispositivo después
      // de cerrar sesión, aunque la petición de logout no tenga conexión.
      clearTravelKitOfflineData();
    }
  }

  return (
    <div className="space-y-10">
      {/* Mis viajes */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[var(--ink)]">Mis viajes</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
            >
              <Plus className="size-4" />
              Nuevo viaje
            </button>
            <button
              onClick={handleSignOut}
              title="Cerrar sesión"
              className="focus-ring inline-flex items-center justify-center rounded-md border border-[var(--line)] p-2 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>

        {showNewForm && (
          <div className="mb-6 rounded-lg border border-[var(--accent)] bg-[var(--accent-soft)] p-5">
            <p className="text-sm font-semibold text-[var(--ink)] mb-4">Nuevo viaje</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Nombre del viaje"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate(false)}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition"
              />
              <input
                type="text"
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
                placeholder="Destino (opcional)"
                onKeyDown={(e) => e.key === "Enter" && handleCreate(false)}
                className="rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition"
              />
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <button
                onClick={() => handleCreate(false)}
                disabled={creating || !newTitle.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-strong)] text-[var(--on-accent)] px-4 py-2 text-sm font-semibold transition hover:bg-[var(--accent)] disabled:opacity-50"
              >
                {creating && <Loader2 className="size-4 animate-spin" />}
                Crear viaje
              </button>
              <button
                onClick={() => handleCreate(true)}
                disabled={creating || !newTitle.trim()}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:opacity-50"
              >
                Guardar como plantilla
              </button>
              <button
                onClick={() => {
                  setShowNewForm(false);
                  setNewTitle("");
                  setNewDestination("");
                }}
                className="ml-auto text-sm text-[var(--muted)] hover:text-[var(--ink)] transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {kits.length === 0 ? (
          <p className="text-[var(--muted)] text-sm py-4">
            Todavía no tienes viajes. ¡Crea el primero o usa una plantilla!
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kits.map((kit) => (
              <KitCard
                key={kit.id}
                kit={kit}
                isOwner={kit.user_id === currentUserId}
                onDelete={() => handleDelete(kit)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Plantillas */}
      {templates.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-[var(--ink)] mb-5">Plantillas</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((tpl) => (
              <KitCard
                key={tpl.id}
                kit={tpl}
                isTemplate
                isOwner
                onClone={() => handleClone(tpl.id)}
                onDelete={() => handleDelete(tpl)}
                cloning={cloningId === tpl.id}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
