import { describe, it, expect } from "vitest";

describe("Campaign Dispatch State Safety Guard", () => {
  const ALLOWED_DISPATCH_STATUSES = ["SCHEDULED", "DRAFT"];

  function validateDispatchEligibility(status: string): { allowed: boolean; error?: string } {
    if (!ALLOWED_DISPATCH_STATUSES.includes(status)) {
      let message = `Cannot dispatch campaign with status "${status}". Only SCHEDULED or DRAFT campaigns can be dispatched.`;
      if (status === "PROCESSING") {
        message = "Campaign is already being processed or dispatched.";
      } else if (status === "COMPLETED") {
        message = "Cannot dispatch campaign: Campaign has already completed.";
      } else if (status === "CANCELLED") {
        message = "Cannot dispatch campaign: Campaign has been cancelled.";
      } else if (status === "FAILED") {
        message = "Cannot dispatch campaign: Campaign has failed.";
      }
      return { allowed: false, error: message };
    }
    return { allowed: true };
  }

  it("permits dispatch for SCHEDULED campaigns", () => {
    const result = validateDispatchEligibility("SCHEDULED");
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("permits dispatch for DRAFT campaigns", () => {
    const result = validateDispatchEligibility("DRAFT");
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects dispatch for COMPLETED campaigns to prevent duplicate dispatches", () => {
    const result = validateDispatchEligibility("COMPLETED");
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("already completed");
  });

  it("rejects dispatch for CANCELLED campaigns", () => {
    const result = validateDispatchEligibility("CANCELLED");
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("has been cancelled");
  });

  it("rejects dispatch for FAILED campaigns", () => {
    const result = validateDispatchEligibility("FAILED");
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("has failed");
  });

  it("rejects dispatch for PROCESSING campaigns to prevent concurrent runs", () => {
    const result = validateDispatchEligibility("PROCESSING");
    expect(result.allowed).toBe(false);
    expect(result.error).toContain("already being processed");
  });

  it("rejects dispatch for unknown or invalid campaign statuses", () => {
    const result = validateDispatchEligibility("ARCHIVED");
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('Cannot dispatch campaign with status "ARCHIVED"');
  });
});
