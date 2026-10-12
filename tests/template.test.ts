import { describe, it, expect } from "vitest";
import {
  extractVariables,
  validateTemplate,
  renderPersonalizedMessage,
} from "../src/lib/template";

describe("Message Template Personalization and Validation", () => {
  it("extracts variables from message with double curly braces", () => {
    const text = "Hello {{name}}, your fee of {{fee_amount}} is due on {{due_date}}.";
    const vars = extractVariables(text);
    expect(vars).toEqual(["name", "fee_amount", "due_date"]);
  });

  it("returns empty array when no variables are present", () => {
    const text = "A message with no variables.";
    expect(extractVariables(text)).toEqual([]);
  });

  it("validates template syntax and catches mismatched braces", () => {
    const invalidText = "Hello {{name, your appointment is confirmed.";
    const result = validateTemplate(invalidText);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("correctly renders personalized message with provided context", () => {
    const template = "Dear {{name}}, your score is {{score}}.";
    const context = { name: "Aarav", score: "98%" };
    const { rendered, missingVariables } = renderPersonalizedMessage(template, context);

    expect(rendered).toBe("Dear Aarav, your score is 98%.");
    expect(missingVariables).toHaveLength(0);
  });

  it("flags missing variables when context is incomplete", () => {
    const template = "Dear {{name}}, your fee is {{fee_amount}} due on {{due_date}}.";
    const context = { name: "Aarav" };
    const { rendered, missingVariables } = renderPersonalizedMessage(template, context);

    expect(missingVariables).toContain("fee_amount");
    expect(missingVariables).toContain("due_date");
    expect(rendered).toContain("{{fee_amount}}");
  });
});
