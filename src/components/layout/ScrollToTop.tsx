import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const SCROLL_POSITION_STORAGE_KEY = "deskforge-scroll-positions";

function readScrollPositions() {
  try {
    const raw = sessionStorage.getItem(SCROLL_POSITION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function writeScrollPositions(positions: Record<string, number>) {
  try {
    sessionStorage.setItem(SCROLL_POSITION_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore storage failures
  }
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const previousPathname = previousPathnameRef.current;

    if (previousPathname) {
      const latestPositions = readScrollPositions();
      latestPositions[previousPathname] =
        window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      writeScrollPositions(latestPositions);
    }

    const scrollToPosition = (top: number) => {
      window.scrollTo({ top, left: 0, behavior: "auto" });
      document.documentElement.scrollTop = top;
      document.body.scrollTop = top;
    };

    const positions = readScrollPositions();
    const savedTop = pathname === "/" ? positions[pathname] : undefined;
    const nextTop = typeof savedTop === "number" ? savedTop : 0;

    if (pathname === "/") {
      const rafId = window.requestAnimationFrame(() => {
        scrollToPosition(nextTop);
        window.requestAnimationFrame(() => {
          scrollToPosition(nextTop);
        });
      });

      const timerId = window.setTimeout(() => {
        scrollToPosition(nextTop);
      }, 80);

      previousPathnameRef.current = pathname;

      return () => {
        window.cancelAnimationFrame(rafId);
        window.clearTimeout(timerId);
      };
    }

    scrollToPosition(0);
    previousPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}
