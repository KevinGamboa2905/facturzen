"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Root-cause fix for the dead / double-click sidebar navigation (§3).
//
// Radix Dialog (our Sheet/Modal overlays) locks the page via react-remove-scroll
// while open — it sets inline `pointer-events: none` / `data-scroll-locked` on
// <body>. On close it should clear them, but there is a well-known cleanup race
// (close animation + unmount) that occasionally leaves <body> locked. A locked
// body swallows pointer events, so the sticky sidebar's <Link> client navigation
// silently fails (the route still works via a hard URL) until the next
// interaction — hence "nothing happens" / "two clicks".
//
// This observer clears a *stuck* lock, but only when no dialog is actually open,
// so it never fights a legitimately-open overlay. Not a workaround for the
// navigation itself — it removes the exact stale state that blocks it.
export function NavGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;

    const unstickIfStale = () => {
      const dialogOpen = document.querySelector(
        '[role="dialog"][data-state="open"], [data-radix-popper-content-wrapper]',
      );
      if (dialogOpen) return; // a real overlay owns the lock — leave it
      if (body.style.pointerEvents === "none") body.style.pointerEvents = "";
      if (body.hasAttribute("data-scroll-locked")) body.removeAttribute("data-scroll-locked");
    };

    const observer = new MutationObserver(unstickIfStale);
    observer.observe(body, { attributes: true, attributeFilter: ["style", "data-scroll-locked"] });
    unstickIfStale(); // also clear anything stuck across a navigation

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
