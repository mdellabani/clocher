interface TextContent {
  title?: string;
  body?: string;
  image?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function TextSection({ content }: { content: TextContent }) {
  if (!content.body) return null;

  return (
    <section className="rounded-[14px] border border-[#f0e8da] bg-white p-6 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      {content.title && (
        <h2 className="mb-3 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
          {content.title}
        </h2>
      )}
      <div className={content.image ? "flex flex-col gap-4 sm:flex-row" : ""}>
        <p className="flex-1 text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-line">
          {content.body}
        </p>
        {content.image && (
          <img
            src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${content.image}`}
            alt="" className="h-48 w-full rounded-lg object-cover sm:w-64 shrink-0"
          />
        )}
      </div>
    </section>
  );
}
