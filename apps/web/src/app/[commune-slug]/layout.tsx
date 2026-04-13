import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCommuneBySlug } from "@rural-community-platform/shared";

export default async function CommuneLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ "commune-slug": string }>;
}) {
  const { "commune-slug": slug } = await params;

  const supabase = await createClient();
  const { data: commune } = await getCommuneBySlug(supabase, slug);

  if (!commune) {
    notFound();
  }

  const primaryColor = commune.primary_color ?? "#1e40af";

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header
        className="text-white shadow-md"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${slug}`} className="text-xl font-bold hover:opacity-90">
            {commune.name}
          </Link>
          <nav className="flex gap-6 text-sm font-medium">
            <Link href={`/${slug}`} className="hover:opacity-80 transition-opacity">
              Accueil
            </Link>
            <Link href={`/${slug}/evenements`} className="hover:opacity-80 transition-opacity">
              Événements
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
          <p>
            Commune de{" "}
            <span className="font-medium text-gray-700">{commune.name}</span>
            {commune.code_postal && (
              <span> — {commune.code_postal}</span>
            )}
          </p>
          <p className="mt-1">Plateforme communautaire rurale</p>
        </div>
      </footer>
    </div>
  );
}
