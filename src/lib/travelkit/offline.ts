"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { KitWithSections, TravelKit } from "@/lib/supabase/types";

const QUEUE_KEY = "travelkit:offline-queue:v1";
const KIT_CACHE_PREFIX = "travelkit:kit:v1:";
const KITS_CACHE_PREFIX = "travelkit:kits:v1:";

export const OFFLINE_QUEUE_CHANGED = "travelkit:offline-queue-changed";
export const OFFLINE_SYNC_COMPLETED = "travelkit:offline-sync-completed";

type OfflineTable = "travel_kits" | "checklist_sections" | "checklist_items";

export type OfflineMutation = {
  id: string;
  createdAt: number;
  table: OfflineTable;
  action: "insert" | "update" | "delete";
  targetId?: string;
  values?: Record<string, unknown>;
};

type MutationInput = Omit<OfflineMutation, "id" | "createdAt">;

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readJson<T>(key: string, fallback: T): T {
  if (!storageAvailable()) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (!storageAvailable()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Safari puede rechazar escrituras en modo privado o por falta de espacio.
  }
}

function emitQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OFFLINE_QUEUE_CHANGED));
  }
}

export function getPendingMutations(): OfflineMutation[] {
  return readJson<OfflineMutation[]>(QUEUE_KEY, []);
}

export function getPendingMutationCount() {
  return getPendingMutations().length;
}

export function queueMutation(input: MutationInput) {
  const queue = getPendingMutations();
  const mutation: OfflineMutation = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };
  queue.push(mutation);
  writeJson(QUEUE_KEY, queue);
  emitQueueChanged();
  return mutation;
}

async function applyMutation(supabase: SupabaseClient, mutation: OfflineMutation) {
  if (mutation.action === "insert") {
    const { error } = await supabase.from(mutation.table).insert(mutation.values ?? {});
    if (error) throw error;
    return;
  }

  if (!mutation.targetId) throw new Error("La mutación offline no tiene targetId");

  if (mutation.action === "update") {
    const { error } = await supabase
      .from(mutation.table)
      .update(mutation.values ?? {})
      .eq("id", mutation.targetId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from(mutation.table).delete().eq("id", mutation.targetId);
  if (error) throw error;
}

let activeSync: Promise<number> | null = null;

export function syncPendingMutations(supabase: SupabaseClient): Promise<number> {
  if (activeSync) return activeSync;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return Promise.resolve(getPendingMutationCount());
  }

  activeSync = (async () => {
    while (typeof navigator === "undefined" || navigator.onLine) {
      const mutation = getPendingMutations().sort((a, b) => a.createdAt - b.createdAt)[0];
      if (!mutation) break;
      await applyMutation(supabase, mutation);
      const current = getPendingMutations().filter((entry) => entry.id !== mutation.id);
      writeJson(QUEUE_KEY, current);
      emitQueueChanged();
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_COMPLETED));
    }
    return getPendingMutationCount();
  })().finally(() => {
    activeSync = null;
  });

  return activeSync;
}

export function cacheKit(kit: KitWithSections) {
  writeJson(`${KIT_CACHE_PREFIX}${kit.id}`, kit);
}

export function readCachedKit(kitId: string) {
  return readJson<KitWithSections | null>(`${KIT_CACHE_PREFIX}${kitId}`, null);
}

export function cacheKits(userId: string, kits: TravelKit[]) {
  writeJson(`${KITS_CACHE_PREFIX}${userId}`, kits);
}

export function readCachedKits(userId: string) {
  return readJson<TravelKit[]>(`${KITS_CACHE_PREFIX}${userId}`, []);
}

export function patchCachedKitInList(
  userId: string,
  kitId: string,
  values: Partial<Pick<TravelKit, "title" | "destination">>
) {
  const kits = readCachedKits(userId);
  if (kits.length === 0) return;
  cacheKits(
    userId,
    kits.map((kit) => (kit.id === kitId ? { ...kit, ...values } : kit))
  );
}

export function clearTravelKitOfflineData() {
  if (!storageAvailable()) return;
  for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("travelkit:")) window.localStorage.removeItem(key);
  }
  emitQueueChanged();
}
