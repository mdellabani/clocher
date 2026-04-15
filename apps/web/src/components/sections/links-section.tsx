interface LinkItem {
  emoji: string;
  label: string;
  url: string;
}

interface LinksContent {
  items?: LinkItem[];
}

export function LinksSection({ content }: { content: LinksContent }) {
  const items = content.items ?? [];
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
        Liens rapides
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <a key={i} href={item.url}
            target={item.url.startsWith("http") ? "_blank" : undefined}
            rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}
            className="flex items-center gap-3 rounded-[14px] border border-[#f0e8da] bg-white px-4 py-3 shadow-[0_1px_4px_rgba(140,120,80,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(140,120,80,0.12)]">
            <span className="text-xl">{item.emoji}</span>
            <span className="text-sm font-medium" style={{ color: "var(--theme-primary)" }}>{item.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
