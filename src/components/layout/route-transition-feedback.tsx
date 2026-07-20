"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n";

const SHOW_DELAY_MS = 120;
const MAX_VISIBLE_MS = 9000;

function getInternalDestination(href: string | URL | null | undefined) {
  if (!href) return null;

  let url: URL;
  try {
    url = href instanceof URL ? href : new URL(href, window.location.href);
  } catch {
    return null;
  }

  if (url.origin !== window.location.origin) return null;
  if (
    url.pathname === window.location.pathname &&
    url.search === window.location.search
  ) {
    return null;
  }

  return url;
}

function getNavigableInternalUrl(event: MouseEvent) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const target = event.target;
  if (!(target instanceof Element)) return null;

  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor) return null;

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) return null;

  const targetAttr = anchor.getAttribute("target");
  if (targetAttr && targetAttr !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  return getInternalDestination(href);
}

export function RouteTransitionFeedback({ locale = "en" }: { locale?: Locale }) {
  const pathname = usePathname() || "/";
  const searchParams = useSearchParams();
  const routeKey = useMemo(
    () => `${pathname}?${searchParams?.toString() ?? ""}`,
    [pathname, searchParams],
  );
  const routeKeyRef = useRef(routeKey);
  const [visibleRouteKey, setVisibleRouteKey] = useState<string | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const visible = visibleRouteKey === routeKey;

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setVisibleRouteKey(null);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    const keyAtStart = routeKeyRef.current;
    showTimerRef.current = window.setTimeout(() => {
      setVisibleRouteKey(keyAtStart);
    }, SHOW_DELAY_MS);
    safetyTimerRef.current = window.setTimeout(() => {
      setVisibleRouteKey(null);
    }, MAX_VISIBLE_MS);
  }, [clearTimers]);

  useEffect(() => {
    routeKeyRef.current = routeKey;
    const frame = window.requestAnimationFrame(reset);
    return () => window.cancelAnimationFrame(frame);
  }, [reset, routeKey]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (getNavigableInternalUrl(event)) start();
    };
    const handlePopState = () => start();
    const handlePageShow = () => reset();
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    const patchedPushState: History["pushState"] = (...args) => {
      if (getInternalDestination(args[2])) start();
      return originalPushState.apply(window.history, args);
    };
    const patchedReplaceState: History["replaceState"] = (...args) => {
      if (getInternalDestination(args[2])) start();
      return originalReplaceState.apply(window.history, args);
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pageshow", handlePageShow);
    window.history.pushState = patchedPushState;
    window.history.replaceState = patchedReplaceState;

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
      if (window.history.pushState === patchedPushState) {
        window.history.pushState = originalPushState;
      }
      if (window.history.replaceState === patchedReplaceState) {
        window.history.replaceState = originalReplaceState;
      }
      clearTimers();
      document.documentElement.classList.remove("ol-route-busy");
    };
  }, [clearTimers, reset, start]);

  useEffect(() => {
    document.documentElement.classList.toggle("ol-route-busy", visible);
    return () => {
      document.documentElement.classList.remove("ol-route-busy");
    };
  }, [visible]);

  if (!visible) return null;

  const copy = locale === "zh" ? "正在打开" : "Opening";

  return (
    <div className="ol-global-route-feedback" role="status" aria-live="polite">
      <div className="ol-global-route-meter" aria-hidden="true" />
      <div className="ol-route-activity" aria-label={copy}>
        <span className="ol-route-activity-orbit" aria-hidden="true">
          <span />
        </span>
        <span>{copy}</span>
      </div>
    </div>
  );
}
