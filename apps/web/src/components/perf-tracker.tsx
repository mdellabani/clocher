"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackNavTiming } from "@/lib/analytics";

const SUPABASE_HOST = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^https?:\/\//, "");

export function PerfTracker() {
  const pathname = usePathname();
  const navStart = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : 0,
  );
  const fetchCount = useRef<number>(0);
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof PerformanceObserver === "undefined" || !SUPABASE_HOST) return;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (
          entry.name.includes(SUPABASE_HOST) &&
          entry.name.includes("/rest/v1/")
        ) {
          fetchCount.current += 1;
        }
      }
    });
    observer.observe({ type: "resource", buffered: false });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (prevPath.current === null) {
      prevPath.current = pathname;
      return;
    }
    if (prevPath.current === pathname) return;
    const now = performance.now();
    trackNavTiming({
      path: prevPath.current,
      durationMs: Math.round(now - navStart.current),
      supabaseFetchCount: fetchCount.current,
    });
    prevPath.current = pathname;
    navStart.current = now;
    fetchCount.current = 0;
  }, [pathname]);

  return null;
}
