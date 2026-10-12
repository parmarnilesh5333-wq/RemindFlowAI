import { describe, it, expect } from "vitest";
import {
  parseCSVText,
  autoDetectColumnMapping,
  validateCSVRows,
} from "../src/lib/csv";

describe("CSV Parsing and Validation", () => {
  it("parses CSV with quoted values, commas, and headers", () => {
    const csv = `Name,Phone,Email,Group\n"Aarav Patel",9876543210,aarav@test.com,"Class 10"\n"Meera Nair",+919876543211,meera@test.com,"Class 12"`;
    const { headers, rows } = parseCSVText(csv);

    expect(headers).toEqual(["Name", "Phone", "Email", "Group"]);
    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe("Aarav Patel");
    expect(rows[1][1]).toBe("+919876543211");
  });

  it("auto-detects common column headers", () => {
    const headers = ["Full Name", "WhatsApp Number", "Email Address", "Batch", "Consent"];
    const mapping = autoDetectColumnMapping(headers);

    expect(mapping.name).toBe("Full Name");
    expect(mapping.phone).toBe("WhatsApp Number");
    expect(mapping.email).toBe("Email Address");
    expect(mapping.roleOrGrade).toBe("Batch");
    expect(mapping.consentStatus).toBe("Consent");
  });

  it("handles invalid rows without discarding valid data", () => {
    const headers = ["Name", "Phone", "Email"];
    const rows = [
      ["Valid User", "9876543210", "valid@test.com"],
      ["", "9876543211", "noname@test.com"], // invalid: empty name
      ["Bad Phone", "invalid123", "badphone@test.com"], // invalid: bad phone
      ["Another Valid", "+919876543212", "valid2@test.com"],
    ];

    const mapping = { name: "Name", phone: "Phone", email: "Email" };
    const validated = validateCSVRows(headers, rows, mapping);

    expect(validated).toHaveLength(4);
    const valid = validated.filter((v) => v.isValid);
    const invalid = validated.filter((v) => !v.isValid);

    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(2);

    expect(invalid[0].errors).toContain("Name is required.");
    expect(invalid[1].errors[0]).toContain("Invalid phone format");
  });

  it("detects in-file duplicate phone numbers", () => {
    const headers = ["Name", "Phone"];
    const rows = [
      ["First Contact", "9876543210"],
      ["Duplicate Contact", "9876543210"], // duplicate within same file
    ];
    const mapping = { name: "Name", phone: "Phone" };
    const validated = validateCSVRows(headers, rows, mapping);

    expect(validated[0].isValid).toBe(true);
    expect(validated[1].isValid).toBe(false);
    expect(validated[1].errors[0]).toContain("Duplicate phone number within this CSV");
  });
});
