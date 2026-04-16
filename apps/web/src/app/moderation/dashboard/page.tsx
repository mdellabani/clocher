import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getPendingProducers,
} from "@rural-community-platform/shared";
import { ThemeInjector } from "@/components/theme-injector";
import { ReportQueue } from "../report-queue";
import { AuditLogView } from "../audit-log-view";

export default async function ModerationDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Layout already authenticated and checked role, but we need user for queries
  const { data: profile } = await getProfile(supabase, user!.id);
  if (!profile) return null;

  // Fetch pending reports with post and reporter info
  const { data: pendingReports } = await supabase
    .from("reports")
    .select(
      "*, profiles!reporter_id(display_name), posts!post_id(id, title, body, author_id, commune_id, type, profiles!author_id(display_name))"
    )
    .eq("status", "pending")
    .eq("posts.commune_id", profile.commune_id)
    .order("created_at", { ascending: false });

  // Pending producers (for this commune)
  const { data: pendingProducers } = await getPendingProducers(
    supabase,
    profile.commune_id
  );

  // Audit log (own actions for moderator, all for admin)
  let auditQuery = supabase
    .from("audit_log")
    .select("*, profiles!actor_id(display_name)")
    .eq("commune_id", profile.commune_id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (profile.role === "moderator") {
    auditQuery = auditQuery.eq("actor_id", user!.id);
  }

  const { data: auditEntries } = await auditQuery;

  // Summary counts
  const reportCount = pendingReports?.length ?? 0;
  const producerCount = pendingProducers?.length ?? 0;

  return (
    <div className="space-y-6">
      <ThemeInjector theme={profile.communes?.theme} customPrimaryColor={profile.communes?.custom_primary_color} />
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">
        Modération
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-4 text-center shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <p
            className="text-2xl font-bold"
            style={{
              color: reportCount > 0 ? "#dc2626" : "var(--foreground)",
            }}
          >
            {reportCount}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Signalements en attente
          </p>
        </div>
        <div className="rounded-[14px] border border-[#f0e8da] bg-white p-4 text-center shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {producerCount}
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Producteurs en attente
          </p>
        </div>
      </div>

      <ReportQueue
        reports={
          (pendingReports ?? []).filter((r) => r.posts !== null) as any[]
        }
      />

      {/* Producers section */}
      {producerCount > 0 && (
        <section className="rounded-[14px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(160,130,90,0.06)]">
          <h2 className="mb-3 text-base font-semibold text-[var(--foreground)]">
            Producteurs en attente ({producerCount})
          </h2>
          <ul className="space-y-2">
            {(pendingProducers ?? []).map((producer) => (
              <li
                key={producer.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border)] px-4 py-3"
              >
                <div>
                  <p className="font-medium text-[var(--foreground)]">
                    {producer.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(producer.created_at).toLocaleDateString(
                      "fr-FR"
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <AuditLogView entries={(auditEntries ?? []) as any[]} />
    </div>
  );
}
