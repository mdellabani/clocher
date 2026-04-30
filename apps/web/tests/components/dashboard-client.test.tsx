import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@pretou/shared";
import { DashboardClient } from "@/app/admin/dashboard/dashboard-client";

vi.mock("@/components/admin/summary-cards", () => ({ SummaryCards: () => <div>SUMMARY</div> }));
vi.mock("@/components/admin/pending-users", () => ({ PendingUsers: () => <div>PENDING_USERS</div> }));
vi.mock("@/components/admin/pending-producers", () => ({ PendingProducers: () => <div>PENDING_PRODUCERS</div> }));
vi.mock("@/components/admin/community-members", () => ({ CommuneMembers: () => <div>MEMBERS</div> }));
vi.mock("@/components/admin/post-management", () => ({ PostManagement: () => <div>POSTS</div> }));
vi.mock("@/components/admin/council-documents", () => ({ CouncilDocuments: () => <div>COUNCIL</div> }));
vi.mock("@/components/admin/invite-code-manager", () => ({ InviteCodeManager: () => <div>INVITE</div> }));
vi.mock("@/components/admin/theme-customizer", () => ({ ThemeCustomizer: () => <div>THEME</div> }));
vi.mock("@/components/admin/commune-info-form", () => ({ CommuneInfoForm: () => <div>INFO</div> }));
vi.mock("@/components/admin/associations-manager", () => ({ AssociationsManager: () => <div>ASSOC</div> }));
vi.mock("@/components/admin/domain-manager", () => ({ DomainManager: () => <div>DOMAIN</div> }));
vi.mock("@/components/admin/admin-tabs", () => ({
  AdminTabs: (props: Record<string, React.ReactNode>) => (
    <div>
      {props.dashboardContent}
      {props.websiteContent}
      {props.communeContent}
      {props.membersContent}
      {props.postsContent}
      {props.journalContent}
    </div>
  ),
}));
vi.mock("@/components/feed-filters", () => ({ FeedFilters: () => <div>FILTERS</div> }));
vi.mock("@/components/create-post-dialog", () => ({ CreatePostDialog: () => <div>CREATE</div> }));
vi.mock("@/components/admin/audit-log-view", () => ({ AuditLogView: () => <div>AUDIT</div> }));
vi.mock("@/components/theme-injector", () => ({ ThemeInjector: () => null }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({
    profile: { id: "u-1", commune_id: "c-1", role: "admin", status: "active", display_name: "Admin" },
    userEmail: "admin@example.fr",
    loading: false,
    isAdmin: true,
    isModerator: true,
  }),
}));

describe("DashboardClient", () => {
  it("renders all 6 tabs from cached data", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.admin.pendingUsers("c-1"), []);
    qc.setQueryData(queryKeys.admin.pendingProducers("c-1"), []);
    qc.setQueryData(queryKeys.admin.members("c-1"), []);
    qc.setQueryData(queryKeys.audit("c-1"), []);
    qc.setQueryData(queryKeys.commune("c-1"), { id: "c-1", slug: "x", invite_code: "ABC", theme: "terre_doc" });
    qc.setQueryData(queryKeys.councilDocs("c-1"), []);
    qc.setQueryData(queryKeys.admin.postsThisWeek("c-1"), 3);

    render(
      <QueryClientProvider client={qc}>
        <DashboardClient />
      </QueryClientProvider>,
    );

    expect(screen.getByText("SUMMARY")).toBeInTheDocument();
    expect(screen.getByText("PENDING_USERS")).toBeInTheDocument();
    expect(screen.getByText("AUDIT")).toBeInTheDocument();
    expect(screen.getByText("THEME")).toBeInTheDocument();
  });
});
