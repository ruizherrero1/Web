"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";

// Registers the Cine service worker (offline shell + cached posters + last
// catalog) and shows a small badge when the device is offline. Writes still
// require a connection; only reading the last catalog works offline for now.
export function CineServiceWorker({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/cine-sw.js", { scope: "/apps/cine" }).catch(() => {
        // The app keeps working without offline support if registration fails.
      });
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <>
      {children}
      {!online && (
        <div
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] left-1/2 z-50 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs font-semibold text-[var(--text-soft)] backdrop-blur"
          aria-live="polite"
        >
          <CloudOff size={15} className="text-[var(--muted)]" />
          Sin conexion - viendo el ultimo catalogo guardado
        </div>
      )}
    </>
  );
}
