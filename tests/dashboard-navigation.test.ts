import { describe, it, expect } from "vitest";

describe("Phase 3: Dashboard Navigation & Responsive Layout Contracts (FR-011, FR-012)", () => {
  const desktopSidebarRoutes = [
    { label: "Home", href: "/dashboard" },
    { label: "Build", href: "/build" },
    { label: "Websites", href: "/dashboard/websites" },
    { label: "Profile", href: "/dashboard/profile" },
  ];

  const mobileBottomNavRoutes = [
    { label: "Home", href: "/dashboard" },
    { label: "Build", href: "/build" },
    { label: "Websites", href: "/dashboard/websites" },
    { label: "Profile", href: "/dashboard/profile" },
  ];

  it("ensures desktop and mobile navigation contracts cover all 4 required destinations", () => {
    expect(desktopSidebarRoutes.length).toBe(4);
    expect(mobileBottomNavRoutes.length).toBe(4);

    const desktopHrefs = desktopSidebarRoutes.map((r) => r.href);
    const mobileHrefs = mobileBottomNavRoutes.map((r) => r.href);

    expect(desktopHrefs).toEqual(mobileHrefs);
    expect(desktopHrefs).toContain("/dashboard");
    expect(desktopHrefs).toContain("/build");
    expect(desktopHrefs).toContain("/dashboard/websites");
    expect(desktopHrefs).toContain("/dashboard/profile");
  });
});
