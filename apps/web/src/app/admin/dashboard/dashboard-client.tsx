"use client";

import { useSearchParams } from "next/navigation";
import type { PostType } from "@rural-community-platform/shared";
import { PendingUsers } from "@/components/admin/pending-users";
import { PendingProducers } from "@/components/admin/pending-producers";
import { PostManagement } from "@/components/admin/post-management";
import { SummaryCards } from "@/components/admin/summary-cards";
import { ThemeInjector } from "@/components/theme-injector";
import { FeedFilters } from "@/components/feed-filters";
import { CreatePostDialog } from "@/components/create-post-dialog";
import { CommuneMembers } from "@/components/admin/community-members";
import { AuditLogView } from "@/app/moderation/audit-log-view";
import { InviteCodeManager } from "@/components/admin/invite-code-manager";
import { ThemeCustomizer } from "@/components/admin/theme-customizer";
import { CommuneInfoForm } from "@/components/admin/commune-info-form";
import { AssociationsManager } from "@/components/admin/associations-manager";
import { CouncilDocuments } from "@/components/admin/council-documents";
import { DomainManager } from "@/components/admin/domain-manager";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { usePendingUsers } from "@/hooks/queries/use-pending-users";
import { usePendingProducers } from "@/hooks/queries/use-pending-producers";
import { useCommuneMembers } from "@/hooks/queries/use-commune-members";
import { useAuditLog } from "@/hooks/queries/use-audit-log";
import { useCommuneAdmin } from "@/hooks/queries/use-commune-admin";
import { useCouncilDocs } from "@/hooks/queries/use-council-docs";
import { usePostsThisWeek } from "@/hooks/queries/use-posts-this-week";
import { useAdminPosts } from "@/hooks/queries/use-admin-posts";
import type { AdminPostFilters } from "@rural-community-platform/shared";

function parseCsv(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

export function DashboardClient({ communeId }: { communeId: string }) {
  const params = useSearchParams();
  const pageParam = params.get("page") ?? "1";
  const perPageParam = params.get("perPage") ?? "10";
  const typesParam = params.get("types") ?? "";
  const dateFilter = params.get("date") ?? "";

  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const perPage = [10, 25, 50].includes(Number(perPageParam)) ? Number(perPageParam) : 10;
  const selectedTypes = parseCsv(typesParam);

  const { data: pendingUsers = [] } = usePendingUsers(communeId);
  const { data: pendingProducers = [] } = usePendingProducers(communeId);
  const { data: communeMembers = [] } = useCommuneMembers(communeId);
  const { data: auditEntries = [] } = useAuditLog(communeId);
  const { data: commune } = useCommuneAdmin(communeId);
  const { data: councilDocs = [] } = useCouncilDocs(communeId);
  const { data: postsThisWeek = 0 } = usePostsThisWeek(communeId);

  const adminPostFilters: AdminPostFilters = { types: selectedTypes, dateFilter: dateFilter as AdminPostFilters["dateFilter"], page, perPage };
  const { data: adminPostsData } = useAdminPosts(communeId, adminPostFilters);

  return (
    <div>
      <ThemeInjector theme={commune?.theme} customPrimaryColor={commune?.custom_primary_color} />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Administration</h1>
        <CreatePostDialog isAdmin={true} communeId={communeId} />
      </div>

      <AdminTabs
        dashboardContent={
          <>
            <SummaryCards
              pendingCount={(pendingUsers?.length ?? 0) + (pendingProducers?.length ?? 0)}
              postsThisWeek={postsThisWeek ?? 0}
              openReports={0}
            />
            <InviteCodeManager currentCode={commune?.invite_code ?? ""} />
            <PendingUsers users={pendingUsers ?? []} />
            <PendingProducers producers={pendingProducers ?? []} />
          </>
        }
        websiteContent={
          <>
            <a href="/admin/homepage"
              className="flex items-center justify-between rounded-[14px] border border-[#f0e8da] bg-white px-5 py-4 shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)]">
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "var(--theme-primary)" }}>
                  Éditeur de page d'accueil
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Personnalisez les sections de votre site communal
                </p>
              </div>
              <span style={{ color: "var(--theme-primary)" }}>→</span>
            </a>
            <ThemeCustomizer
              currentTheme={commune?.theme ?? "terre_doc"}
              currentCustomColor={commune?.custom_primary_color ?? null}
              currentLogoUrl={commune?.logo_url ?? null}
            />
            <DomainManager
              slug={commune?.slug ?? ""}
              customDomain={commune?.custom_domain ?? null}
              domainVerified={commune?.domain_verified ?? false}
            />
          </>
        }
        communeContent={
          <>
            <CommuneInfoForm
              address={commune?.address ?? null}
              phone={commune?.phone ?? null}
              email={commune?.email ?? null}
              openingHours={(commune?.opening_hours as Record<string, string>) ?? {}}
            />
            <AssociationsManager associations={(commune?.associations as any[]) ?? []} />
            <InviteCodeManager currentCode={commune?.invite_code ?? ""} />
          </>
        }
        membersContent={
          <CommuneMembers members={(communeMembers ?? []) as any[]} />
        }
        postsContent={
          <>
            <FeedFilters types={selectedTypes} date={dateFilter} />
            <PostManagement
              posts={(adminPostsData?.posts ?? []) as Array<{ id: string; title: string; type: PostType; is_pinned: boolean; created_at: string; profiles: { display_name: string } | null }>}
              totalCount={adminPostsData?.totalCount ?? 0}
              page={page}
              perPage={perPage}
            />
            <CouncilDocuments documents={(councilDocs ?? []) as any[]} />
          </>
        }
        moderationContent={
          <AuditLogView entries={(auditEntries ?? []) as any[]} />
        }
      />
    </div>
  );
}
