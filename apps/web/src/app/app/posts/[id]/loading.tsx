export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-pulse">
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-5 w-20 rounded bg-gray-200" />
        <div className="h-7 w-3/4 rounded bg-gray-200" />
        <div className="flex gap-3">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-32 rounded bg-gray-200" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-4 w-full rounded bg-gray-200" />
          <div className="h-4 w-5/6 rounded bg-gray-200" />
          <div className="h-4 w-2/3 rounded bg-gray-200" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 rounded bg-gray-200" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 space-y-2">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-4 w-full rounded bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
