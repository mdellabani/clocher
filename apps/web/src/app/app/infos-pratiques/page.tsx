import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@rural-community-platform/shared";
import { ThemeInjector } from "@/components/theme-injector";

interface InfosPratiques {
  horaires?: string;
  contact?: string;
  services?: string;
  associations?: string;
  liens?: string;
}

const SECTION_LABELS: Record<keyof InfosPratiques, string> = {
  horaires: "Horaires de la mairie",
  contact: "Contact",
  services: "Services de proximité",
  associations: "Associations",
  liens: "Liens utiles",
};

const SECTION_ORDER: (keyof InfosPratiques)[] = [
  "horaires",
  "contact",
  "services",
  "associations",
  "liens",
];

export default async function AppInfosPratiquesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile) redirect("/auth/signup");
  if (profile.status === "pending") redirect("/auth/pending");

  // Fetch commune with infos_pratiques
  const { data: commune } = await supabase
    .from("communes")
    .select("name, theme, infos_pratiques")
    .eq("id", profile.commune_id)
    .single();

  const infos = ((commune?.infos_pratiques as Record<string, string>) ?? {}) as InfosPratiques;
  const sections = SECTION_ORDER.filter(
    (key) => infos[key] && infos[key]!.trim().length > 0
  );

  return (
    <div className="space-y-6">
      <ThemeInjector theme={commune?.theme} />

      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Infos pratiques — {commune?.name}
      </h1>

      {sections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((key) => (
            <section
              key={key}
              className="rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]"
            >
              <h2
                className="mb-3 text-sm font-semibold uppercase tracking-wide"
                style={{ color: "var(--theme-primary)" }}
              >
                {SECTION_LABELS[key]}
              </h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]">
                {infos[key]}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted-foreground)]">
          Aucune information pratique disponible pour le moment.
        </p>
      )}
    </div>
  );
}
