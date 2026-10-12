import { describe, it, expect } from "vitest";
import {
  parseWithBuiltInEngine,
  normalizeLanguage,
  parseReminderPrompt,
} from "../src/lib/ai-reminder-engine";

describe("AI Reminder Parsing Engine - Multilingual Generation", () => {
  const existingGroups = [
    { id: "g_1", name: "Students" },
    { id: "g_2", name: "Parents" },
    { id: "g_3", name: "Class 10 CBSE Maths" },
    { id: "g_4", name: "Class 12 Physics" },
  ];
  const refDate = new Date("2026-10-15T09:00:00Z");

  // Regex patterns for script verification
  const gujaratiRegex = /[\u0A80-\u0AFF]/;
  const hindiRegex = /[\u0900-\u097F]/;

  it("normalizes language strings correctly", () => {
    expect(normalizeLanguage("English")).toBe("English");
    expect(normalizeLanguage("english")).toBe("English");
    expect(normalizeLanguage("ગુજરાતી (Gujarati)")).toBe("Gujarati");
    expect(normalizeLanguage("Gujarati")).toBe("Gujarati");
    expect(normalizeLanguage("gujarati")).toBe("Gujarati");
    expect(normalizeLanguage("हिंदी (Hindi)")).toBe("Hindi");
    expect(normalizeLanguage("Hindi")).toBe("Hindi");
    expect(normalizeLanguage("hindi")).toBe("Hindi");
  });

  it("generates entire reminder in natural English when English is selected", () => {
    const prompt = "Create a fee reminder for the Class 10 CBSE Maths group tomorrow at 10 AM.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "English"
    );

    expect(result.language).toBe("English");
    expect(result.campaignName).toContain("English");
    expect(result.message).toContain("Dear {{name}}");
    expect(result.message).toContain("fee of {{fee_amount}}");
    expect(result.message).toContain("due on {{due_date}}");
    // Message should not contain non-Latin Indic scripts
    expect(gujaratiRegex.test(result.message)).toBe(false);
    expect(hindiRegex.test(result.message)).toBe(false);
    expect(result.variables).toContain("name");
    expect(result.variables).toContain("fee_amount");
  });

  it("generates entire reminder in natural Gujarati script when Gujarati is selected", () => {
    const prompt = "Create a fee reminder for the Class 10 CBSE Maths group tomorrow at 10 AM.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "Gujarati"
    );

    expect(result.language).toBe("Gujarati");
    expect(result.campaignName).toContain("ગુજરાતી");
    // Verify natural Gujarati script in message body
    expect(gujaratiRegex.test(result.message)).toBe(true);
    expect(result.message).toContain("નમસ્તે {{name}}");
    expect(result.message).toContain("બાકી ફી {{fee_amount}}");
    expect(result.message).toContain("{{due_date}}");
    expect(result.message).toContain("આભાર");
    expect(result.variables).toContain("name");
    expect(result.variables).toContain("fee_amount");
  });

  it("generates entire reminder in natural Hindi script when Hindi is selected", () => {
    const prompt = "Create a fee reminder for the Class 10 CBSE Maths group tomorrow at 10 AM.";
    const result = parseWithBuiltInEngine(
      prompt,
      existingGroups,
      "Asia/Kolkata",
      refDate,
      "Hindi"
    );

    expect(result.language).toBe("Hindi");
    expect(result.campaignName).toContain("हिंदी");
    // Verify natural Hindi Devanagari script in message body
    expect(hindiRegex.test(result.message)).toBe(true);
    expect(result.message).toContain("नमस्ते {{name}}");
    expect(result.message).toContain("देय फीस {{fee_amount}}");
    expect(result.message).toContain("{{due_date}}");
    expect(result.message).toContain("धन्यवाद");
    expect(result.variables).toContain("name");
    expect(result.variables).toContain("fee_amount");
  });

  it("regenerating with different language option immediately updates the generated message", () => {
    const prompt = "Send a meeting reminder to Parents group tomorrow at 4 PM.";

    // 1. Generate in English
    const resEn = parseWithBuiltInEngine(prompt, existingGroups, "Asia/Kolkata", refDate, "English");
    expect(resEn.language).toBe("English");
    expect(resEn.message).toContain("Dear {{name}}");
    expect(resEn.message).toContain("Parent-Teacher Meeting");

    // 2. Regenerate in Gujarati
    const resGu = parseWithBuiltInEngine(prompt, existingGroups, "Asia/Kolkata", refDate, "Gujarati");
    expect(resGu.language).toBe("Gujarati");
    expect(gujaratiRegex.test(resGu.message)).toBe(true);
    expect(resGu.message).toContain("નમસ્તે {{name}}");
    expect(resGu.message).toContain("વાલી-શિક્ષક મીટિંગ");

    // 3. Regenerate in Hindi
    const resHi = parseWithBuiltInEngine(prompt, existingGroups, "Asia/Kolkata", refDate, "Hindi");
    expect(resHi.language).toBe("Hindi");
    expect(hindiRegex.test(resHi.message)).toBe(true);
    expect(resHi.message).toContain("नमस्ते {{name}}");
    expect(resHi.message).toContain("अभिभावक-शिक्षक बैठक");
  });

  it("passes targetLanguage through the top-level parseReminderPrompt function", async () => {
    const prompt = "Send notice to Class 12 Physics tomorrow at 11 AM about the test";
    const res = await parseReminderPrompt({
      userPrompt: prompt,
      existingGroups,
      userTimezone: "Asia/Kolkata",
      currentDate: refDate,
      targetLanguage: "Gujarati",
    });

    expect(res.language).toBe("Gujarati");
    expect(gujaratiRegex.test(res.message)).toBe(true);
    expect(res.targetGroup).toBe("Class 12 Physics");
    expect(res.matchedGroupExact).toBe(true);
  });

  it("warns about missing audience when no group is provided in prompt", () => {
    const prompt = "Send a reminder tomorrow at 11 AM about the test";
    const result = parseWithBuiltInEngine(prompt, existingGroups, "Asia/Kolkata", refDate, "English");

    expect(result.missingInformation.length).toBeGreaterThan(0);
    expect(result.missingInformation[0]).toContain("No recipient group detected");
  });

  it("warns about missing time when no time is specified", () => {
    const prompt = "Create fee reminder for Students tomorrow";
    const result = parseWithBuiltInEngine(prompt, existingGroups, "Asia/Kolkata", refDate, "English");

    expect(result.missingInformation.some((m) => m.includes("time"))).toBe(true);
    expect(result.scheduledTime).toBe("10:00");
  });
});
