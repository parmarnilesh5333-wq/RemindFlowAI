import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Premium 3D SaaS Landing Page & Complete Internal Application Redesign", () => {
  const landingPath = path.join(process.cwd(), "src/app/page.tsx");
  const dashboardPath = path.join(process.cwd(), "src/app/dashboard/page.tsx");
  const aiBuilderPath = path.join(process.cwd(), "src/app/ai-builder/page.tsx");
  const campaignsPath = path.join(process.cwd(), "src/app/campaigns/page.tsx");
  const contactsPath = path.join(process.cwd(), "src/app/contacts/page.tsx");
  const consentPath = path.join(process.cwd(), "src/app/consent/page.tsx");
  const reportsPath = path.join(process.cwd(), "src/app/reports/page.tsx");
  const settingsPath = path.join(process.cwd(), "src/app/settings/page.tsx");
  const loginPath = path.join(process.cwd(), "src/app/login/page.tsx");
  const appShellPath = path.join(process.cwd(), "src/components/layout/AppShell.tsx");
  const globalsCssPath = path.join(process.cwd(), "src/app/globals.css");

  it("renders the centered 3D SaaS landing page at / and keeps the dashboard strictly at /dashboard", () => {
    expect(fs.existsSync(landingPath)).toBe(true);
    expect(fs.existsSync(dashboardPath)).toBe(true);
    expect(fs.existsSync(loginPath)).toBe(true);

    const landingSource = fs.readFileSync(landingPath, "utf-8");
    const dashboardSource = fs.readFileSync(dashboardPath, "utf-8");

    // Verify exact centered hero headline, subtitle, and buttons
    expect(landingSource).toContain("RemindFlow");
    expect(landingSource).toContain("Every reminder,");
    expect(landingSource).toContain("right on time.");
    expect(landingSource).toContain(
      "Stay organized, remember what matters, and keep your day moving with RemindFlow AI."
    );
    expect(landingSource).toContain("Enter RemindFlow AI");
    expect(landingSource).toContain("Discover Features");

    // Verify 3D hero timepiece sculpture & floating conceptual reminder cards (no embedded dashboard UI or real user data)
    expect(landingSource).toContain('data-testid="abstract-time-showcase"');
    expect(landingSource).toContain("saas-3d-core");
    expect(landingSource).toContain("saas-3d-card");
    expect(landingSource).toContain("animate-card-left-1");
    expect(landingSource).toContain("animate-card-right-1");
    expect(landingSource).not.toContain("RemindFlow AI — Workspace Preview");
    expect(landingSource).not.toContain("Aarav Patel");

    // Verify benefits strip & required feature headings
    expect(landingSource).toContain("Natural Language Drafting");
    expect(landingSource).toContain("Smart Reminder Management");
    expect(landingSource).toContain("Reliable Scheduling");
    expect(landingSource).toContain("Simple Organization");

    // Verify final call to action copy
    expect(landingSource).toContain("Ready to stay on track?");

    // Verify dark professional SaaS dashboard header at /dashboard
    expect(dashboardSource).toContain("Your reminders, organized with precision.");
  });

  it("removes all pink/pastel/pookie styling across all internal application pages", () => {
    const internalFiles = [
      dashboardPath,
      aiBuilderPath,
      campaignsPath,
      contactsPath,
      consentPath,
      reportsPath,
      settingsPath,
      loginPath,
      appShellPath,
    ];

    for (const filePath of internalFiles) {
      const source = fs.readFileSync(filePath, "utf-8");
      expect(source).not.toContain("blush-");
      expect(source).not.toContain("ivory-");
      expect(source).not.toContain("plum-");
      expect(source).not.toContain("3D Intro");
    }
  });

  it("wires working navigation from navbar and CTAs to /dashboard, #features, and #how-it-works", () => {
    const landingSource = fs.readFileSync(landingPath, "utf-8");
    const appShellSource = fs.readFileSync(appShellPath, "utf-8");

    expect(landingSource).toContain('href="/dashboard"');
    expect(landingSource).toContain('href="#features"');
    expect(landingSource).toContain('id="features"');
    expect(landingSource).toContain('href="#how-it-works"');
    expect(landingSource).toContain('id="how-it-works"');

    // Verify AppShell keeps "/" and "/login" separate from internal dashboard chrome
    expect(appShellSource).toContain('pathname === "/"');
    expect(appShellSource).toContain('pathname === "/login"');
    expect(appShellSource).toContain('href: "/dashboard"');
  });

  it("discloses simulation mode honestly and respects reduced-motion preferences", () => {
    const landingSource = fs.readFileSync(landingPath, "utf-8");
    const cssSource = fs.readFileSync(globalsCssPath, "utf-8");

    expect(landingSource).toContain("Simulation Mode Active");
    expect(landingSource).toContain("prefers-reduced-motion: reduce");
    expect(cssSource).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
