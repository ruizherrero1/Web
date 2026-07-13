"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { CINE_QUEUE_CHANGED, getPendingCount } from "../_lib/offline";

// Registers the Cine service worker (offline shell + cached posters + last
// catalog) and shows a small badge when the device is offline or there are
// writes queued to sync. Reads work offline; queued writes replay on reconnect.
export function CineServiceWorker({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/cine-sw.js", { scope: "/apps/cine" }).catch(() => {
        // The app keeps working without offline support if registration fails.
      });
    }

    const refreshPending = () => setPending(getPendingCount());
    refreshPending();
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(CINE_QUEUE_CHANGED, refreshPending);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(CINE_QUEUE_CHANGED, refreshPending);
    };
  }, []);

  const visible = !online || pending > 0;
  if (!visible) return <>{children}</>;

  return (
    <>
      {children}
      <div
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs font-semibold text-[var(--text-soft)] backdrop-blur"
        aria-live="polite"
      >
        {online ? (
          <RefreshCw size={15} className="animate-spin text-[var(--gold)]" />
        ) : (
          <CloudOff size={15} className="text-[var(--muted)]" />
        )}
        {!online
          ? `Sin conexion${pending ? ` - ${pending} por sincronizar` : " - ultimo catalogo guardado"}`
          : `Sincronizando ${pending} cambio${pending === 1 ? "" : "s"}...`}
      </div>
    </>
  );
}
