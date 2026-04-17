import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeCustomizer } from "@/components/admin/theme-customizer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const updateThemeAction = vi.fn().mockResolvedValue({ error: null });
const uploadLogoAction = vi.fn().mockResolvedValue({ error: null });
const removeLogoAction = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/app/admin/dashboard/theme-actions", () => ({
  updateThemeAction: (...a: unknown[]) => updateThemeAction(...a),
  uploadLogoAction: (...a: unknown[]) => uploadLogoAction(...a),
  removeLogoAction: () => removeLogoAction(),
}));

describe("ThemeCustomizer", () => {
  it("hides 'Aperçu non sauvegardé' pill on mount", () => {
    render(
      <ThemeCustomizer currentTheme="terre_doc" currentCustomColor={null} currentLogoUrl={null} />,
    );
    expect(screen.queryByText("Aperçu non sauvegardé")).not.toBeInTheDocument();
  });

  it("shows pill after picking a different theme", () => {
    render(
      <ThemeCustomizer currentTheme="terre_doc" currentCustomColor={null} currentLogoUrl={null} />,
    );
    // Find theme buttons by their role and filter to find one that isn't currently selected (no ring-2 class)
    const themeButtons = screen.getAllByRole("button").filter((btn) => {
      // Theme buttons contain the theme name text and styling; look for ring-2 indicator
      return btn.className && btn.className.includes("ring-2");
    });

    // Find a non-active theme button (one without ring-2)
    const buttons = screen.getAllByRole("button");
    const nonActiveSwatch = buttons.find((btn) => {
      return (
        btn.className &&
        btn.className.includes("border-2") &&
        btn.className.includes("text-center") &&
        !btn.className.includes("ring-2")
      );
    });

    if (!nonActiveSwatch) throw new Error("expected at least one non-active swatch");
    fireEvent.click(nonActiveSwatch);
    expect(screen.getByText("Aperçu non sauvegardé")).toBeInTheDocument();
  });

  it("renders preview override <style> only when picker is dirty", () => {
    const { container } = render(
      <ThemeCustomizer currentTheme="terre_doc" currentCustomColor={null} currentLogoUrl={null} />,
    );
    expect(container.querySelectorAll("style").length).toBe(0);

    // Find and click a non-active theme button
    const buttons = screen.getAllByRole("button");
    const nonActiveSwatch = buttons.find((btn) => {
      return (
        btn.className &&
        btn.className.includes("border-2") &&
        btn.className.includes("text-center") &&
        !btn.className.includes("ring-2")
      );
    });

    if (!nonActiveSwatch) throw new Error("expected at least one non-active swatch");
    fireEvent.click(nonActiveSwatch);
    expect(container.querySelectorAll("style").length).toBe(1);
  });

  it("hides remove-logo button when no logo present", () => {
    render(
      <ThemeCustomizer currentTheme="terre_doc" currentCustomColor={null} currentLogoUrl={null} />,
    );
    expect(screen.queryByText("Supprimer")).not.toBeInTheDocument();
  });

  it("shows remove-logo button when a logo URL is provided", () => {
    render(
      <ThemeCustomizer
        currentTheme="terre_doc"
        currentCustomColor={null}
        currentLogoUrl="https://example.com/logo.png"
      />,
    );
    expect(screen.getByText("Supprimer")).toBeInTheDocument();
  });
});
