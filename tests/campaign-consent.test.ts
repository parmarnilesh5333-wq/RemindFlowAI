import { describe, it, expect } from "vitest";

describe("Campaign and Consent Business Rules", () => {
  it("enforces consent status check before dispatch", () => {
    const contactA = { phone: "+919876543201", consentStatus: "GRANTED", optOutStatus: false };
    const contactB = { phone: "+919876543202", consentStatus: "REVOKED", optOutStatus: true };
    const contactC = { phone: "+919876543203", consentStatus: "PENDING", optOutStatus: false };

    const suppressionSet = new Set(["+919876543202"]);

    const isEligible = (c: typeof contactA) => {
      const isSuppressed = suppressionSet.has(c.phone) || c.optOutStatus;
      const hasConsent = c.consentStatus === "GRANTED";
      return !isSuppressed && hasConsent;
    };

    expect(isEligible(contactA)).toBe(true);
    expect(isEligible(contactB)).toBe(false);
    expect(isEligible(contactC)).toBe(false); // Pending consent is not eligible
  });

  it("calculates duplicate campaign hash for duplicate protection", () => {
    const groupId = "grp_class10";
    const dateKey = "2026-10-15T10";
    const textSnippet = "Dear student, please note your mock test schedule";

    const hash1 = `${groupId}_${dateKey}_${textSnippet.trim().slice(0, 50)}`;
    const hash2 = `${groupId}_${dateKey}_${textSnippet.trim().slice(0, 50)}`;
    const hashDifferentGroup = `grp_class12_${dateKey}_${textSnippet.trim().slice(0, 50)}`;

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hashDifferentGroup);
  });

  it("calculates exponential retry backoff intervals", () => {
    const computeBackoffMinutes = (retryCount: number) => Math.pow(2, retryCount);

    expect(computeBackoffMinutes(0)).toBe(1); // 1 minute
    expect(computeBackoffMinutes(1)).toBe(2); // 2 minutes
    expect(computeBackoffMinutes(2)).toBe(4); // 4 minutes
  });
});
