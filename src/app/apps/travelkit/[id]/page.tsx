"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { ChecklistItem, KitWithSections, SectionWithItems } from "@/lib/supabase/types";
import { SharePanel } from "../_components/SharePanel";
import {
  cacheKit,
  OFFLINE_SYNC_COMPLETED,
  patchCachedKitInList,
  queueMutation,
  readCachedKit,
} from "@/lib/travelkit/offline";
import {
  ChevronLeft,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  MapPin,
  Pencil,
  X,
} from "lucide-react";

// ── SectionBlock ────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  onToggleItem,
  onToggleAll,
  onDeleteItem,
  onAddItem,
  onUpdateTitle,
  onDelete,
}: {
  section: SectionWithItems;
  onToggleItem: (itemId: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (label: string) => void;
  onUpdateTitle: (title: string) => void;
  onDelete: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(section.title);
  const [addingItem, setAddingItem] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  function saveTitle() {
    if (titleDraft.trim()) onUpdateTitle(titleDraft.trim());
    setEditingTitle(false);
  }

  function submitNewItem() {
    if (!newLabel.trim()) return;
    onAddItem(newLabel.trim());
    setNewLabel("");
    setAddingItem(false);
  }

  const checked = section.items.filter((i) => i.checked).length;
  const allChecked = section.items.length > 0 && checked === section.items.length;

  function confirmToggleAll() {
    if (section.items.length === 0) return;
    const action = allChecked ? "desmarcar" : "marcar";
    if (
      confirm(
        `¿Seguro que quieres ${action} todos los ítems de "${section.title}"?`
      )
    ) {
      onToggleAll(!allChecked);
    }
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5">
      {/* Header */}
      <div className={`flex items-center gap-1 ${collapsed ? "" : "mb-4"}`}>
        {editingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="flex-1 text-base font-bold text-[var(--ink)] bg-transparent border-b border-[var(--accent)] focus:outline-none"
            />
            <button onClick={saveTitle} className="grid size-11 place-items-center text-[var(--accent-dark)]">
              <Check className="size-5" />
            </button>
            <button onClick={() => setEditingTitle(false)} className="grid size-11 place-items-center text-[var(--muted)]">
              <X className="size-5" />
            </button>
          </div>
        ) : (
          <>
            {/* Toda la zona de título pliega/despliega la sección */}
            <button
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              className="flex flex-1 items-center gap-2 min-w-0 min-h-11 text-left"
            >
              <ChevronDown
                className={`size-5 shrink-0 text-[var(--muted)] transition-transform ${
                  collapsed ? "-rotate-90" : ""
                }`}
              />
              <h2 className="text-lg font-bold text-[var(--ink)] truncate">{section.title}</h2>
              {section.items.length > 0 && (
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold transition ${
                    checked === section.items.length
                      ? "bg-[var(--accent-soft)] text-[var(--accent-dark)]"
                      : "bg-[var(--surface-strong)] text-[var(--muted)]"
                  }`}
                >
                  {checked}/{section.items.length}
                </span>
              )}
            </button>
            {section.items.length > 0 && (
              <button
                type="button"
                onClick={confirmToggleAll}
                aria-label={allChecked ? "Desmarcar todos los ítems" : "Marcar todos los ítems"}
                title={allChecked ? "Desmarcar todo" : "Marcar todo"}
                className="focus-ring inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-xs font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--accent-soft)]"
              >
                {allChecked ? "Nada" : "Todo"}
              </button>
            )}
            <button
              onClick={() => {
                setTitleDraft(section.title);
                setEditingTitle(true);
              }}
              aria-label="Editar título de sección"
              className="shrink-0 grid size-11 place-items-center text-[var(--muted)] opacity-40 transition hover:opacity-100 hover:text-[var(--ink)]"
            >
              <Pencil className="size-4" />
            </button>
          </>
        )}
        <button
          onClick={onDelete}
          aria-label="Eliminar sección"
          className="focus-ring -mr-2 grid size-11 shrink-0 place-items-center text-[var(--muted)] opacity-40 transition hover:text-red-500 hover:opacity-100"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Items (ocultos al plegar) */}
      {!collapsed && section.items.length > 0 && (
        <ul className="-mx-2 mb-2 divide-y divide-[var(--line)]">
          {section.items.map((item) => (
            <li key={item.id} className="flex items-center">
              {/* Toda la fila es pulsable: área de toque cómoda para móvil */}
              <button
                onClick={() => onToggleItem(item.id, !item.checked)}
                aria-pressed={item.checked}
                className="flex flex-1 items-center gap-3 rounded-lg px-2 py-2.5 min-h-12 text-left transition active:bg-[var(--surface-strong)]"
              >
                <span
                  className={`size-7 shrink-0 rounded-md border-2 flex items-center justify-center transition ${
                    item.checked
                      ? "bg-[var(--accent)] border-[var(--accent)]"
                      : "border-[var(--line)]"
                  }`}
                >
                  {item.checked && <Check className="size-4 text-white" strokeWidth={3} />}
                </span>
                <span
                  className={`flex-1 text-base leading-snug transition ${
                    item.checked ? "line-through text-[var(--muted)]" : "text-[var(--ink)]"
                  }`}
                >
                  {item.label}
                </span>
              </button>
              <button
                onClick={() => onDeleteItem(item.id)}
                aria-label="Eliminar ítem"
                className="focus-ring grid size-11 shrink-0 place-items-center text-[var(--muted)] opacity-40 transition hover:text-red-500 hover:opacity-100"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add item (oculto al plegar) */}
      {!collapsed && (addingItem ? (
        <div className="flex items-center gap-2 mt-2">
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNewItem();
              if (e.key === "Escape") setAddingItem(false);
            }}
            placeholder="Nuevo ítem..."
            className="flex-1 rounded-md border border-[var(--line)] bg-[var(--surface-strong)] px-3 py-1.5 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition"
          />
          <button onClick={submitNewItem} className="text-[var(--accent-dark)] hover:text-[var(--accent)] transition">
            <Check className="size-4" />
          </button>
          <button onClick={() => setAddingItem(false)} className="text-[var(--muted)] hover:text-[var(--ink)] transition">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAddingItem(true)}
          className="flex min-h-11 items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--accent-dark)] transition mt-1"
        >
          <Plus className="size-4" />
          Añadir ítem
        </button>
      ))}
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function KitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [kit, setKit] = useState<KitWithSections | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDest, setEditingDest] = useState(false);
  const [destDraft, setDestDraft] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const fetchKit = useCallback(async () => {
    const cached = readCachedKit(id);
    if (cached) {
      setKit(cached);
      setLoading(false);
    }

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    setCurrentUserId(user?.id ?? null);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      return;
    }

    const { data: kitData, error: kitError } = await supabase
      .from("travel_kits")
      .select("*")
      .eq("id", id)
      .single();

    if (!kitData) {
      if (!cached && kitError?.code === "PGRST116") router.push("/apps/travelkit");
      setLoading(false);
      return;
    }

    const { data: sections } = await supabase
      .from("checklist_sections")
      .select("*, checklist_items(*)")
      .eq("kit_id", id)
      .order("position");

    const freshKit: KitWithSections = {
      ...kitData,
      sections: (sections ?? []).map((s) => ({
        ...s,
        items: ((s.checklist_items ?? []) as ChecklistItem[]).sort(
          (a, b) => a.position - b.position
        ),
      })),
    };
    setKit(freshKit);
    cacheKit(freshKit);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    queueMicrotask(() => void fetchKit());
    const handleSync = () => void fetchKit();
    window.addEventListener(OFFLINE_SYNC_COMPLETED, handleSync);
    return () => window.removeEventListener(OFFLINE_SYNC_COMPLETED, handleSync);
  }, [fetchKit]);

  useEffect(() => {
    if (kit) cacheKit(kit);
  }, [kit]);

  // ── Title ──

  function saveTitle() {
    if (!kit || !titleDraft.trim()) return;
    const title = titleDraft.trim();
    setKit((k) => (k ? { ...k, title } : null));
    if (currentUserId) patchCachedKitInList(currentUserId, kit.id, { title });
    queueMutation({ table: "travel_kits", action: "update", targetId: kit.id, values: { title } });
    setEditingTitle(false);
  }

  function saveDest() {
    if (!kit) return;
    const destination = destDraft.trim() || null;
    setKit((k) => (k ? { ...k, destination } : null));
    if (currentUserId) patchCachedKitInList(currentUserId, kit.id, { destination });
    queueMutation({
      table: "travel_kits",
      action: "update",
      targetId: kit.id,
      values: { destination },
    });
    setEditingDest(false);
  }

  // ── Sections ──

  function addSection() {
    if (!kit || !newSectionTitle.trim()) return;
    const section: SectionWithItems = {
      id: crypto.randomUUID(),
      kit_id: kit.id,
      title: newSectionTitle.trim(),
      position: kit.sections.length,
      created_at: new Date().toISOString(),
      items: [],
    };
    setKit((k) => (k ? { ...k, sections: [...k.sections, section] } : null));
    queueMutation({
      table: "checklist_sections",
      action: "insert",
      values: {
        id: section.id,
        kit_id: section.kit_id,
        title: section.title,
        position: section.position,
      },
    });
    setNewSectionTitle("");
    setAddingSection(false);
  }

  function updateSectionTitle(sectionId: string, title: string) {
    setKit((k) =>
      k ? { ...k, sections: k.sections.map((s) => (s.id === sectionId ? { ...s, title } : s)) } : null
    );
    queueMutation({
      table: "checklist_sections",
      action: "update",
      targetId: sectionId,
      values: { title },
    });
  }

  function deleteSection(sectionId: string) {
    if (!confirm("¿Eliminar esta sección y todos sus ítems?")) return;
    setKit((k) => (k ? { ...k, sections: k.sections.filter((s) => s.id !== sectionId) } : null));
    queueMutation({ table: "checklist_sections", action: "delete", targetId: sectionId });
  }

  // ── Items ──

  function addItem(sectionId: string, label: string) {
    const section = kit?.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const item: ChecklistItem = {
      id: crypto.randomUUID(),
      section_id: sectionId,
      label,
      checked: false,
      position: section.items.length,
      created_at: new Date().toISOString(),
    };
    setKit((k) =>
      k
        ? {
            ...k,
            sections: k.sections.map((s) =>
              s.id === sectionId ? { ...s, items: [...s.items, item] } : s
            ),
          }
        : null
    );
    queueMutation({
      table: "checklist_items",
      action: "insert",
      values: {
        id: item.id,
        section_id: item.section_id,
        label: item.label,
        checked: item.checked,
        position: item.position,
      },
    });
  }

  function toggleItem(sectionId: string, itemId: string, checked: boolean) {
    setKit((k) =>
      k
        ? {
            ...k,
            sections: k.sections.map((s) =>
              s.id === sectionId
                ? { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, checked } : i)) }
                : s
            ),
          }
        : null
    );
    queueMutation({
      table: "checklist_items",
      action: "update",
      targetId: itemId,
      values: { checked },
    });
  }

  function toggleAllItems(sectionId: string, checked: boolean) {
    const section = kit?.sections.find((entry) => entry.id === sectionId);
    if (!section) return;

    const changedItems = section.items.filter((item) => item.checked !== checked);
    if (changedItems.length === 0) return;

    setKit((current) =>
      current
        ? {
            ...current,
            sections: current.sections.map((entry) =>
              entry.id === sectionId
                ? {
                    ...entry,
                    items: entry.items.map((item) => ({ ...item, checked })),
                  }
                : entry
            ),
          }
        : null
    );

    for (const item of changedItems) {
      queueMutation({
        table: "checklist_items",
        action: "update",
        targetId: item.id,
        values: { checked },
      });
    }
  }

  function deleteItem(sectionId: string, itemId: string) {
    setKit((k) =>
      k
        ? {
            ...k,
            sections: k.sections.map((s) =>
              s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
            ),
          }
        : null
    );
    queueMutation({ table: "checklist_items", action: "delete", targetId: itemId });
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="container-shell py-12 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-[var(--surface-strong)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!kit) return null;

  const allItems = kit.sections.flatMap((s) => s.items);
  const checkedCount = allItems.filter((i) => i.checked).length;
  const progress = allItems.length > 0 ? Math.round((checkedCount / allItems.length) * 100) : 0;

  return (
    <div className="container-shell py-12">
      {/* Back */}
      <Link
        href="/apps/travelkit"
        className="focus-ring inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition mb-6"
      >
        <ChevronLeft className="size-4" />
        Mis viajes
      </Link>

      {/* Title */}
      <div className="mb-1">
        {editingTitle ? (
          <div className="flex items-center gap-3">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveTitle();
                if (e.key === "Escape") setEditingTitle(false);
              }}
              className="text-4xl font-bold text-[var(--ink)] bg-transparent border-b-2 border-[var(--accent)] focus:outline-none flex-1 min-w-0"
            />
            <button onClick={saveTitle} className="text-[var(--accent-dark)] shrink-0">
              <Check className="size-6" />
            </button>
            <button onClick={() => setEditingTitle(false)} className="text-[var(--muted)] shrink-0">
              <X className="size-6" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 group">
            <h1 className="text-4xl font-bold text-[var(--ink)] sm:text-5xl">{kit.title}</h1>
            <button
              onClick={() => { setTitleDraft(kit.title); setEditingTitle(true); }}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[var(--muted)] hover:text-[var(--ink)] transition shrink-0"
            >
              <Pencil className="size-5" />
            </button>
          </div>
        )}
      </div>

      {/* Destination */}
      <div className="mt-2 mb-6">
        {editingDest ? (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-[var(--muted)] shrink-0" />
            <input
              autoFocus
              value={destDraft}
              onChange={(e) => setDestDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDest();
                if (e.key === "Escape") setEditingDest(false);
              }}
              placeholder="Añadir destino..."
              className="text-lg text-[var(--muted)] bg-transparent border-b border-[var(--accent)] focus:outline-none"
            />
            <button onClick={saveDest} className="text-[var(--accent-dark)]"><Check className="size-4" /></button>
            <button onClick={() => setEditingDest(false)} className="text-[var(--muted)]"><X className="size-4" /></button>
          </div>
        ) : (
          <button
            onClick={() => { setDestDraft(kit.destination ?? ""); setEditingDest(true); }}
            className="flex items-center gap-1.5 text-lg text-[var(--muted)] hover:text-[var(--ink)] transition group"
          >
            <MapPin className="size-4 shrink-0" />
            <span>{kit.destination ?? "Añadir destino..."}</span>
            <Pencil className="size-3.5 opacity-0 group-hover:opacity-100 transition" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {allItems.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-[var(--muted)]">Progreso</span>
            <span className="font-semibold text-[var(--ink)]">
              {checkedCount} / {allItems.length} · {progress}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-strong)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-5">
        {kit.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            onToggleItem={(itemId, checked) => toggleItem(section.id, itemId, checked)}
            onToggleAll={(checked) => toggleAllItems(section.id, checked)}
            onDeleteItem={(itemId) => deleteItem(section.id, itemId)}
            onAddItem={(label) => addItem(section.id, label)}
            onUpdateTitle={(title) => updateSectionTitle(section.id, title)}
            onDelete={() => deleteSection(section.id)}
          />
        ))}

        {/* Add section */}
        {addingSection ? (
          <div className="rounded-lg border border-dashed border-[var(--accent)] p-4">
            <div className="flex items-center gap-3">
              <input
                autoFocus
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addSection();
                  if (e.key === "Escape") setAddingSection(false);
                }}
                placeholder="Nombre de la sección (ej: Documentos, Ropa...)"
                className="flex-1 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none transition"
              />
              <button
                onClick={addSection}
                disabled={!newSectionTitle.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--accent-strong)] text-[var(--on-accent)] px-3 py-2 text-sm font-semibold transition hover:bg-[var(--accent)] disabled:opacity-50"
              >
                Añadir
              </button>
              <button
                onClick={() => { setAddingSection(false); setNewSectionTitle(""); }}
                className="text-[var(--muted)] hover:text-[var(--ink)] transition"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingSection(true)}
            className="focus-ring w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--line)] py-3 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-dark)]"
          >
            <Plus className="size-4" />
            Nueva sección
          </button>
        )}
      </div>

      {/* Compartir */}
      {currentUserId && (
        <div className="mt-8">
          <SharePanel
            kitId={kit.id}
            isOwner={kit.user_id === currentUserId}
            currentUserId={currentUserId}
          />
        </div>
      )}
    </div>
  );
}
