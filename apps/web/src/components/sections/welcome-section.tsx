interface WelcomeContent {
  title?: string;
  body?: string;
  image?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function WelcomeSection({ content }: { content: WelcomeContent }) {
  if (!content.body) return null;

  return (
    <section className="rounded-[14px] border border-[#f0e8da] bg-white p-6 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <div className={`flex gap-6 ${content.image ? "flex-col sm:flex-row" : ""}`}>
        {content.image && (
          <img
            src={`${SUPABASE_URL}/storage/v1/object/public/website-images/${content.image}`}
            alt=""
            className="h-32 w-32 shrink-0 rounded-xl object-cover"
          />
        )}
        <div>
          {content.title && (
            <h2 className="mb-3 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
              {content.title}
            </h2>
          )}
          <p className="text-sm leading-relaxed text-[var(--foreground)] whitespace-pre-line">
            {content.body}
          </p>
        </div>
      </div>
    </section>
  );
}
