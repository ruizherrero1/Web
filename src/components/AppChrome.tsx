"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

type AppChromeProps = {
  children: React.ReactNode;
};

function isStandaloneDisplay() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 768px)").matches;
}

export function AppChrome({ children }: AppChromeProps) {
  const pathname = usePathname();
  const isMundialApp = pathname?.startsWith("/apps/mundial") ?? false;
  const [hideSiteChrome, setHideSiteChrome] = useState(false);
  const shouldHideSiteChrome = isMundialApp && hideSiteChrome;

  useEffect(() => {
    if (!isMundialApp) {
      return undefined;
    }

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const fullscreenQuery = window.matchMedia("(display-mode: fullscreen)");
    const mobileQuery = window.matchMedia("(max-width: 768px)");

    function syncChromeVisibility() {
      setHideSiteChrome(isStandaloneDisplay() || isMobileViewport());
    }

    const frame = window.requestAnimationFrame(syncChromeVisibility);
    standaloneQuery.addEventListener("change", syncChromeVisibility);
    fullscreenQuery.addEventListener("change", syncChromeVisibility);
    mobileQuery.addEventListener("change", syncChromeVisibility);

    return () => {
      window.cancelAnimationFrame(frame);
      standaloneQuery.removeEventListener("change", syncChromeVisibility);
      fullscreenQuery.removeEventListener("change", syncChromeVisibility);
      mobileQuery.removeEventListener("change", syncChromeVisibility);
    };
  }, [isMundialApp]);

  return (
    <>
      {shouldHideSiteChrome ? null : <Header />}
      <main>{children}</main>
      {shouldHideSiteChrome ? null : <Footer />}
    </>
  );
}
