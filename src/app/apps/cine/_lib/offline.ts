import type { MediaKind, PendingCategory, ProfileKey, WatchStatus } from "./types";

// Offline write queue for Cine. When a rating/watched/pending change is made
// without a connection, it is stored here and replayed when the app is online
// again. Reads use the service-worker cached catalog; only writes are queued.

export type StateMutation = {
  kind: "state";
  body: {
    tmdbId: number;
    mediaType: MediaKind;
    status?: WatchStatus;
    rating?: number | null;
    season?: number | null;
    episode?: number | null;
    scope?: "me" | "both";
  };
};

export type PendingMutation = {
  kind: "pending";
  action: "add" | "remove";
  body: { tmdbId: number; mediaType: MediaKind; category: PendingCategory };
};

export type CineMutation = StateMutation | PendingMutation;

type QueuedMutation = { id: string; mutation: CineMutation };

const STORAGE_KEY = "cine-offline-queue-v1";
export const CINE_QUEUE_CHANGED = "cine-queue-changed";

function read(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function write(items: QueuedMutation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(CINE_QUEUE_CHANGED));
  } catch {
    // Storage full or unavailable: nothing else we can safely do.
  }
}

export function enqueueMutation(mutation: CineMutation) {
  const items = read();
  items.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, mutation });
  write(items);
}

export function getPendingCount() {
  return read().length;
}

// Replays queued mutations in order. A server rejection (4xx) drops the item
// (it will never succeed); a network error keeps the rest for the next attempt.
export async function flushQueue(accessToken: string): Promise<number> {
  const remaining = read();
  let flushed = 0;

  while (remaining.length) {
    const [next] = remaining;
    try {
      const response = await sendMutation(next.mutation, accessToken);
      remaining.shift();
      if (response.ok) flushed += 1;
      write(remaining);
    } catch {
      break;
    }
  }

  return flushed;
}

function sendMutation(mutation: CineMutation, accessToken: string) {
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` };
  if (mutation.kind === "state") {
    return fetch("/api/cine/state", { method: "POST", headers, body: JSON.stringify(mutation.body) });
  }
  return fetch("/api/cine/pending", {
    method: mutation.action === "add" ? "POST" : "DELETE",
    headers,
    body: JSON.stringify(mutation.body),
  });
}
