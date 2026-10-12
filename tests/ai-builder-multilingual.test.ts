import { describe, it, expect } from "vitest";
import {
  parseWithBuiltInEngine,
  normalizeLanguage,
} from "../src/lib/ai-reminder-engine";
import { toTimezoneIso } from "../src/lib/date-utils";

describe("AI Reminder Builder - Multilingual Group Matching & Resolution", () => {
  const existingGroups = [
    { id: "grp_10_maths", name: "Class 10 CBSE Maths" },
    { id: "grp_12_physics", name: "Class 12 Physics" },
    { id: "grp_parents", name: "Parent Council" },
    { id: "grp_robotics", name: "Weekend Robotics Club" },
    { id: "grp_students", name: "All Students Batch" },
  ];
  const refDate = new Date("2026-10-15T09:00:00Z");

  it("matches Gujarati prompt to English-named group 'Class 10 CBSE Maths'", () => {
    const prompt = "ક્લાસ 10 CBSE ગણિત ગ્રૂપ માટે આવતીકાલે સવારે 10 વાગ્યે ફી રીમાઇન્ડર બનાવો.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "Gujarati"
    );

    expect(result.targetGroupId).toBe("grp_10_maths");
    expect(result.targetGroup).toBe("Class 10 CBSE Maths");
    expect(result.matchedGroupExact).toBe(true);
    expect(result.campaignName).toContain("Class 10 CBSE Maths");
    expect(result.campaignName).not.toContain("Unspecified Audience");
    expect(
      result.missingInformation.some((m) => m.toLowerCase().includes("no recipient group detected"))
    ).toBe(false);
  });

  it("matches Hindi prompt to English-named group 'Class 10 CBSE Maths'", () => {
    const prompt = "Class 10 CBSE Maths ग्रुप के लिए कल सुबह 10 बजे फीस का रिमाइंडर बनाएं.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "Hindi"
    );

    expect(result.targetGroupId).toBe("grp_10_maths");
    expect(result.targetGroup).toBe("Class 10 CBSE Maths");
    expect(result.matchedGroupExact).toBe(true);
    expect(result.campaignName).toContain("Class 10 CBSE Maths");
    expect(result.campaignName).not.toContain("Unspecified Audience");
  });

  it("matches Gujarati prompt for physics to 'Class 12 Physics'", () => {
    const prompt = "ક્લાસ 12 ભૌતિક વિજ્ઞાન બેચ માટે શુક્રવારે ટેસ્ટ સૂચના મોકલો.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "Gujarati"
    );

    expect(result.targetGroupId).toBe("grp_12_physics");
    expect(result.targetGroup).toBe("Class 12 Physics");
    expect(result.matchedGroupExact).toBe(true);
  });

  it("matches Gujarati prompt for parents to 'Parent Council'", () => {
    const prompt = "વાલી મંડળ માટે શનિવારે સવારે 11 વાગ્યે PTM રીમાઇન્ડર બનાવો.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "Gujarati"
    );

    expect(result.targetGroupId).toBe("grp_parents");
    expect(result.targetGroup).toBe("Parent Council");
    expect(result.matchedGroupExact).toBe(true);
  });

  it("treats explicitly selected group ID as authoritative when prompt has no conflicting group", () => {
    const prompt = "Send a reminder tomorrow at 10 AM regarding uniform requirements.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "English",
      "grp_robotics"
    );

    expect(result.targetGroupId).toBe("grp_robotics");
    expect(result.targetGroup).toBe("Weekend Robotics Club");
    expect(result.matchedGroupExact).toBe(true);
    expect(result.hasAudienceConflict).toBe(false);
    expect(result.campaignName).toContain("Weekend Robotics Club");
    expect(
      result.missingInformation.some((m) => m.toLowerCase().includes("no recipient group detected"))
    ).toBe(false);
  });

  it("detects and flags conflict when prompt mentions one group but dropdown selects another", () => {
    // Prompt explicitly mentions Class 10 Maths, but user selected Robotics Club in dropdown
    const prompt = "Create a reminder for the Class 10 CBSE Maths group tomorrow at 10 AM.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "English",
      "grp_robotics"
    );

    expect(result.hasAudienceConflict).toBe(true);
    expect(result.audienceConflictWarning).toBeDefined();
    expect(result.audienceConflictWarning).toContain("Audience conflict");
    expect(result.audienceConflictWarning).toContain("Class 10 CBSE Maths");
    expect(result.audienceConflictWarning).toContain("Weekend Robotics Club");
    expect(result.missingInformation).toContain(result.audienceConflictWarning);
  });

  it("accurately generates ISO datetime with toTimezoneIso independent of local host timezone", () => {
    const isoKolkata = toTimezoneIso("2026-10-15", "10:00", "Asia/Kolkata");
    // 10:00 AM IST (UTC+5:30) is 04:30 UTC
    expect(isoKolkata).toBe("2026-10-15T04:30:00.000Z");

    const isoUtc = toTimezoneIso("2026-10-15", "10:00", "UTC");
    expect(isoUtc).toBe("2026-10-15T10:00:00.000Z");
  });
});
