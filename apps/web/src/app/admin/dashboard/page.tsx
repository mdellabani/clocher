import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getProfile,
  getPendingUsers,
  getPendingProducers,
  getCommuneMembers,
  getAuditLog,
} from "@rural-community-platform/shared";
import { PendingUsers } from "@/components/admin/pending-users";
import { PendingProducers } from "@/components/admin/pending-producers";
import { PostManagement } from "@/components/admin/post-management";
import { SummaryCards } from "@/components/admin/summary-cards";
import { ThemeInjector } from "@/components/theme-injector";
import { FeedFilters } from "@/components/feed-filters";
import type { PostType } from "@rural-community-platform/shared";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { CommuneMembers } from "@/components/admin/community-members";
import { AuditLogView } from "@/app/moderation/audit-log-view";
import { InviteCodeManager } from "@/components/admin/invite-code-manager";
import { ThemeCustomizer } from "@/components/admin/theme-customizer";
import { CommuneInfoForm } from "@/components/admin/commune-info-form";
import { AssociationsManager } from "@/components/admin/associations-manager";
import { CouncilDocuments } from "@/components/admin/council-documents";
import { DomainManager } from "@/components/admin/domain-manager";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; perPage?: string; types?: string; date?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const perPage = [10, 25, 50].includes(Number(params.perPage)) ? Number(params.perPage) : 10;
  const typesParam = params.types ?? "";
  const selectedTypes = typesParam ? typesParam.split(",").filter(Boolean) : [];
  const dateFilter = params.date ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await getProfile(supabase, user.id);
  if (!profile || profile.role !== "admin") redirect("/app/feed");

  const { data: pendingUsers } = await getPendingUsers(supabase, profile.commune_id);
  const { data: pendingProducers } = await getPendingProducers(supabase, profile.commune_id);
  const { data: communeMembers } = await getCommuneMembers(supabase, profile.commune_id);
  const { data: auditEntries } = await getAuditLog(supabase, profile.commune_id, 50);

  const { data: commune } = await supabase
    .from("communes")
    .select("slug, invite_code, theme, custom_primary_color, logo_url, address, phone, email, opening_hours, associations, custom_domain, domain_verified")
    .eq("id", profile.commune_id)
    .single();

  const { data: councilDocs } = await supabase
    .from("council_documents")
    .select("id, title, category, document_date, storage_path")
    .eq("commune_id", profile.commune_id)
    .order("document_date", { ascending: false });

  // Count posts this week (for summary card)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const { count: postsThisWeek } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", profile.commune_id)
    .gte("created_at", oneWeekAgo.toISOString());

  // Compute date filter boundary
  let dateSince: string | null = null;
  if (dateFilter === "today") {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    dateSince = d.toISOString();
  } else if (dateFilter === "week") {
    const d = new Date(); d.setDate(d.getDate() - 7);
    dateSince = d.toISOString();
  } else if (dateFilter === "month") {
    const d = new Date(); d.setDate(d.getDate() - 30);
    dateSince = d.toISOString();
  }

  // Count total posts (with optional filters)
  let countQuery = supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("commune_id", profile.commune_id)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString());
  if (selectedTypes.length > 0) countQuery = countQuery.in("type", selectedTypes);
  if (dateSince) countQuery = countQuery.gte("created_at", dateSince);
  const { count: totalCount } = await countQuery;

  // Fetch paginated posts
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  let postsQuery = supabase
    .from("posts")
    .select("id, title, type, is_pinned, created_at, profiles!author_id(display_name)")
    .eq("commune_id", profile.commune_id)
    .or("expires_at.is.null,expires_at.gt." + new Date().toISOString())
    .order("created_at", { ascending: false })
    .range(from, to);
  if (selectedTypes.length > 0) postsQuery = postsQuery.in("type", selectedTypes);
  if (dateSince) postsQuery = postsQuery.gte("created_at", dateSince);
  const { data: posts } = await postsQuery;

  return (
    <div className="space-y-6">
      <ThemeInjector theme={profile.communes?.theme} customPrimaryColor={profile.communes?.custom_primary_color} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Administration</h1>
        <CreatePostDialog isAdmin={true} />
      </div>

      <SummaryCards
        pendingCount={(pendingUsers?.length ?? 0) + (pendingProducers?.length ?? 0)}
        postsThisWeek={postsThisWeek ?? 0}
        openReports={0}
      />

      <InviteCodeManager currentCode={commune?.invite_code ?? ""} />

      <DomainManager
        slug={commune?.slug ?? ""}
        customDomain={commune?.custom_domain ?? null}
        domainVerified={commune?.domain_verified ?? false}
      />

      <ThemeCustomizer
        currentTheme={commune?.theme ?? "terre_doc"}
        currentCustomColor={commune?.custom_primary_color ?? null}
        currentLogoUrl={commune?.logo_url ?? null}
      />

      <CommuneInfoForm
        address={commune?.address ?? null}
        phone={commune?.phone ?? null}
        email={commune?.email ?? null}
        openingHours={(commune?.opening_hours as Record<string, string>) ?? {}}
      />
      <AssociationsManager associations={(commune?.associations as any[]) ?? []} />
      <CouncilDocuments documents={(councilDocs ?? []) as any[]} />

      <PendingUsers users={pendingUsers ?? []} />
      <PendingProducers producers={pendingProducers ?? []} />
      <CommuneMembers members={(communeMembers ?? []) as any[]} />
      <FeedFilters types={selectedTypes} date={dateFilter} />

      <PostManagement
        posts={
          (posts ?? []).map((p) => ({
            id: p.id,
            title: p.title,
            type: p.type as PostType,
            is_pinned: p.is_pinned ?? false,
            created_at: p.created_at,
            profiles: Array.isArray(p.profiles) ? p.profiles[0] ?? null : p.profiles,
          }))
        }
        totalCount={totalCount ?? 0}
        page={page}
        perPage={perPage}
      />

      <AuditLogView entries={(auditEntries ?? []) as any[]} />
    </div>
  );
}
