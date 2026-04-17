import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryKeys } from "@rural-community-platform/shared";
import { HomepageClient } from "@/app/admin/homepage/homepage-client";

vi.mock("@/components/admin/section-editors/section-editor", () => ({ SectionEditor: () => <div>SECTION_EDITOR</div> }));
vi.mock("@/components/theme-injector", () => ({ ThemeInjector: () => null }));
vi.mock("@/app/admin/homepage/actions", () => ({
  updateSectionAction: vi.fn(),
  addSectionAction: vi.fn(() => ({ id: "new-id" })),
  deleteSectionAction: vi.fn(),
  reorderSectionsAction: vi.fn(),
  uploadSectionImageAction: vi.fn(() => Promise.resolve("/url")),
  seedDefaultSectionsAction: vi.fn(),
}));

describe("HomepageClient", () => {
  it("renders homepage editor with sections from cache", () => {
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(queryKeys.admin.homepageSections("c-1"), [
      { id: "s-1", section_type: "hero", visible: true, sort_order: 0, content: {} },
    ]);
    qc.setQueryData(queryKeys.commune("c-1"), { id: "c-1", slug: "x", theme: "terre_doc" });

    render(
      <QueryClientProvider client={qc}>
        <HomepageClient communeId="c-1" />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Éditeur de page d'accueil")).toBeInTheDocument();
    expect(screen.getByText("Personnalisez les sections de votre site communal")).toBeInTheDocument();
  });
});
