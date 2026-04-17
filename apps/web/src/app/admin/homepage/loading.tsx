export default function Loading() {
  return (
    <div className="animate-pulse mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-64 rounded bg-gray-200" />
          <div className="mt-2 h-4 w-80 rounded bg-gray-200" />
        </div>
        <div className="h-5 w-40 rounded bg-gray-200" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="h-5 w-1/4 rounded bg-gray-200" />
          <div className="mt-3 h-20 w-full rounded bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
