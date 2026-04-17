"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { makeQueryClient } from "@/lib/query/client";
import { PerfTracker } from "@/components/perf-tracker";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // useState ensures a stable client across re-renders; a new one is created
  // per mount so React 19 concurrent rendering doesn't accidentally share
  // state between simultaneous render attempts.
  const [client] = useState(() => makeQueryClient());
  return (
    <QueryClientProvider client={client}>
      <PerfTracker />
      {children}
    </QueryClientProvider>
  );
}
