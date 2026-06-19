"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getPendingMutationCount,
  OFFLINE_QUEUE_CHANGED,
  syncPendingMutations,
} from "@/lib/travelkit/offline";

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pending, setPending] = useState(() => getPendingMutationCount());
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(() => {
    setPending(getPendingMutationCount());
  }, []);

  const sync = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) return;
    setSyncing(true);
    try {
      await syncPendingMutations(createClient());
    } catch {
      // La cola permanece intacta y se reintentará al volver la conexión o al
      // tocar el indicador. RLS sigue validando cada escritura en Supabase.
    } finally {
      setSyncing(false);
      refreshPending();
    }
  }, [refreshPending]);

  useEffect(() => {
    const supabase = createClient();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/travelkit-sw.js", { scope: "/apps/travelkit" }).catch(() => {
        // La app continúa con caché de datos aunque el navegador no admita SW.
      });
    }

    const handleOnline = () => {
      setOnline(true);
      void sync();
    };
    const handleOffline = () => setOnline(false);
    const handleQueue = () => {
      refreshPending();
      if (navigator.onLine) void sync();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_QUEUE_CHANGED, handleQueue);
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session && navigator.onLine) queueMicrotask(() => void sync());
    });
    if (navigator.onLine) queueMicrotask(() => void sync());

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_CHANGED, handleQueue);
      authListener.subscription.unsubscribe();
    };
  }, [refreshPending, sync]);

  const visible = !online || pending > 0 || syncing;

  return (
    <>
      {children}
      {visible && (
        <button
          type="button"
          onClick={() => void sync()}
          disabled={!online || syncing}
          className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--ink)] shadow-lg disabled:cursor-default"
          aria-live="polite"
        >
          {syncing ? (
            <RefreshCw className="size-4 animate-spin text-[var(--accent)]" />
          ) : (
            <CloudOff className="size-4 text-[var(--muted)]" />
          )}
          {!online
            ? `Sin conexión${pending ? ` · ${pending} pendiente${pending === 1 ? "" : "s"}` : ""}`
            : syncing
              ? "Sincronizando…"
              : `${pending} pendiente${pending === 1 ? "" : "s"} · Reintentar`}
        </button>
      )}
    </>
  );
}
