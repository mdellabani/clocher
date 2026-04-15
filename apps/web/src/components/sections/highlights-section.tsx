import Link from "next/link";

interface HighlightItem {
  title: string;
  description: string;
  link?: string;
  image?: string;
}

interface HighlightsContent {
  items?: HighlightItem[];
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function HighlightsSection({ content }: { content: HighlightsContent }) {
  const items = content.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        À la une
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const card = (
            <div className="rounded-[14px] border border-[#f0e8da] bg-white overflow-hidden shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)]">
              {item.image && (
                <img
                  src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${item.image}`}
                  alt="" className="h-36 w-full object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="font-semibold text-[var(--foreground)]">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-2">{item.description}</p>
              </div>
            </div>
          );
          if (item.link) {
            return <Link key={i} href={item.link} className="block">{card}</Link>;
          }
          return <div key={i}>{card}</div>;
        })}
      </div>
    </section>
  );
}
