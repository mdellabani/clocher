export const AnalyticsEvents = {
  FEATURE_USED: "feature_used",
  PAGE_VIEWED: "page_viewed",
  ERROR_OCCURRED: "error_occurred",
  QUOTA_CHECK: "quota_check",
  NAV_TIMING: "nav_timing",
} as const;

export function trackNavTiming(properties: {
  path: string;
  durationMs: number;
  supabaseFetchCount: number;
}): void {
  try {
    if (typeof window !== "undefined" && "posthog" in window) {
      (window as unknown as { posthog: { capture: (e: string, p: unknown) => void } }).posthog.capture(
        AnalyticsEvents.NAV_TIMING,
        properties,
      );
    }
  } catch {
    // Silent fail — analytics must never break the app
  }
}

export function trackFeature(
  featureName: string,
  properties?: Record<string, unknown>
): void {
  try {
    if (typeof window !== "undefined" && "posthog" in window) {
      (window as any).posthog.capture(AnalyticsEvents.FEATURE_USED, {
        feature: featureName,
        ...properties,
      });
    }
  } catch {
    // Silent fail — analytics should never break the app
  }
}

export interface QuotaUsage {
  provider: "turso" | "supabase";
  metrics: {
    name: string;
    current: number;
    limit: number;
    percentage: number;
    unit: string;
  }[];
  timestamp: string;
}
