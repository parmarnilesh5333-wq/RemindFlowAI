import { describe, it, expect } from "vitest";
import { normalizePhoneNumber, formatPhoneDisplay } from "../src/lib/phone";

describe("Phone Validation and Normalization", () => {
  it("normalizes standard 10-digit Indian numbers with default +91", () => {
    const res = normalizePhoneNumber("9876543210");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+919876543210");
  });

  it("handles numbers with spaces, dashes, and parens", () => {
    const res = normalizePhoneNumber("+91 (98765) 43-210");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+919876543210");
  });

  it("handles 11-digit numbers with leading 0", () => {
    const res = normalizePhoneNumber("09876543210");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+919876543210");
  });

  it("handles international numbers with + prefix", () => {
    const res = normalizePhoneNumber("+14155552671");
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+14155552671");
  });

  it("rejects invalid or too short numbers", () => {
    const res = normalizePhoneNumber("12345");
    expect(res.isValid).toBe(false);
    expect(res.error).toBeDefined();
  });

  it("rejects empty or whitespace-only strings", () => {
    const res = normalizePhoneNumber("   ");
    expect(res.isValid).toBe(false);
  });

  it("formats phone for friendly UI display", () => {
    const formatted = formatPhoneDisplay("+919876543210");
    expect(formatted).toBe("+91 98765 43210");
  });
});
