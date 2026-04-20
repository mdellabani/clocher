import { notFound } from "next/navigation";
import Link from "next/link";
import { getCommuneBySlugCached } from "@/lib/cached-fetchers/commune";
import { ThemeInjector } from "@/components/theme-injector";

export default async function CommuneLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ "commune-slug": string }>;
}) {
  const { "commune-slug": slug } = await params;

  const commune = await getCommuneBySlugCached(slug);

  if (!commune) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--theme-background)]">
      <ThemeInjector theme={commune.theme} customPrimaryColor={commune.custom_primary_color} />

      {/* Thin gradient accent bar */}
      <div
        className="h-1"
        style={{
          background:
            "linear-gradient(90deg, var(--theme-gradient-1), var(--theme-gradient-2), var(--theme-gradient-3))",
        }}
      />

      {/* White institutional header */}
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            {commune.logo_url ? (
              <img
                src={commune.logo_url}
                alt={`Logo de ${commune.name}`}
                className="h-10 w-10 object-contain"
              />
            ) : commune.blason_url && (
              <img
                src={commune.blason_url}
                alt={`Blason de ${commune.name}`}
                className="h-10 w-10 object-contain"
              />
            )}
            <div>
              <Link
                href={`/${slug}`}
                className="text-xl font-semibold transition-opacity hover:opacity-80"
                style={{ color: "var(--theme-primary)" }}
              >
                {commune.name}
              </Link>
              {commune.code_postal && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {commune.code_postal}
                </p>
              )}
              {commune.motto && (
                <p className="text-xs italic text-[var(--muted-foreground)]">
                  {commune.motto}
                </p>
              )}
            </div>
          </div>
          <nav className="hidden gap-6 text-sm font-medium md:flex">
            <Link href={`/${slug}`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Accueil
            </Link>
            <Link href={`/${slug}/evenements`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Événements
            </Link>
            <Link href={`/${slug}/infos-pratiques`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Infos pratiques
            </Link>
            <Link href={`/${slug}/bulletin`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Bulletin
            </Link>
            <Link href={`/${slug}/conseil-municipal`}
              className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--theme-primary)]">
              Conseil municipal
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="mt-auto border-t border-[var(--border)] bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
          <p>
            Commune de{" "}
            <span className="font-medium text-[var(--foreground)]">{commune.name}</span>
            {commune.code_postal && <span> — {commune.code_postal}</span>}
          </p>
          <p className="mt-1">
            <Link href={`/${slug}/mentions-legales`} className="underline hover:text-[var(--foreground)]">
              Mentions légales
            </Link>
            {" · "}Plateforme communautaire rurale
          </p>
        </div>
      </footer>
    </div>
  );
}
