import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlugCached } from "@/lib/cached-fetchers/commune";
import { FileText } from "lucide-react";

type Props = { params: Promise<{ "commune-slug": string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { "commune-slug": slug } = await params;
  const commune = await getCommuneBySlugCached(slug);
  return { title: commune ? `Conseil municipal — ${commune.name}` : "Conseil municipal" };
}

const CATEGORY_LABELS: Record<string, string> = {
  deliberation: "Délibérations",
  pv: "Procès-verbaux",
  compte_rendu: "Comptes-rendus",
};

const CATEGORIES = ["deliberation", "pv", "compte_rendu"] as const;

export default async function ConseilMunicipalPage({ params }: Props) {
  const { "commune-slug": slug } = await params;
  const commune = await getCommuneBySlugCached(slug);
  if (!commune) notFound();
  const supabase = await createClient();

  const { data: documents } = await supabase
    .from("council_documents")
    .select("id, title, category, document_date, storage_path")
    .eq("commune_id", commune.id)
    .order("document_date", { ascending: false });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const grouped = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, (documents ?? []).filter((d) => d.category === cat)])
  );

  const hasAny = (documents ?? []).length > 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--theme-primary)" }}>
        Conseil municipal
      </h1>

      {!hasAny ? (
        <p className="py-8 text-center text-[var(--muted-foreground)]">Aucun document publié.</p>
      ) : (
        CATEGORIES.map((cat) => {
          const docs = grouped[cat];
          if (docs.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="mb-3 text-lg font-semibold" style={{ color: "var(--theme-primary)" }}>
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="space-y-2">
                {docs.map((doc) => (
                  <a key={doc.id}
                    href={`${supabaseUrl}/storage/v1/object/public/council-documents/${doc.storage_path}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_1px_4px_rgba(140,120,80,0.06)] transition-all hover:shadow-[0_4px_12px_rgba(140,120,80,0.12)]">
                    <FileText size={20} style={{ color: "var(--theme-primary)" }} />
                    <div className="flex-1">
                      <p className="font-medium text-[var(--foreground)]">{doc.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {new Date(doc.document_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
