import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NavBar } from "@/components/nav-bar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/app/feed",
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const mockProfile = vi.hoisted(() => ({ value: null as unknown }));
vi.mock("@/hooks/use-profile", () => ({
  useProfile: () => mockProfile.value,
}));

function setProfile(state: {
  loading?: boolean;
  isAdmin?: boolean;
  isModerator?: boolean;
  communeName?: string;
  displayName?: string;
}) {
  mockProfile.value = {
    loading: state.loading ?? false,
    isAdmin: state.isAdmin ?? false,
    isModerator: state.isModerator ?? false,
    profile: state.loading
      ? null
      : {
          display_name: state.displayName ?? "Test User",
          communes: { name: state.communeName ?? "Saint-Médard", code_postal: "64370", motto: null },
        },
  };
}

describe("NavBar", () => {
  it("renders skeleton while loading", () => {
    setProfile({ loading: true });
    const { container } = render(<NavBar />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("shows commune name once loaded", () => {
    setProfile({ communeName: "Morlanne" });
    render(<NavBar />);
    expect(screen.getByText("Morlanne")).toBeInTheDocument();
  });

  it("hides Admin link for residents", () => {
    setProfile({ isAdmin: false, isModerator: false });
    render(<NavBar />);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Modération")).not.toBeInTheDocument();
  });

  it("shows Admin link for admin", () => {
    setProfile({ isAdmin: true });
    render(<NavBar />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("never shows a Modération link (moderator role removed)", () => {
    setProfile({ isAdmin: false, isModerator: true });
    render(<NavBar />);
    expect(screen.queryByText("Modération")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
