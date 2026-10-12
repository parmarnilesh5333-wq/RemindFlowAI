import { normalizePhoneNumber } from "./phone";
import { ConsentStatus, CSVRowValidation } from "./types";

export interface ColumnMapping {
  name: string;
  phone: string;
  email?: string;
  roleOrGrade?: string;
  notes?: string;
  consentStatus?: string;
  group?: string;
}

/**
 * Basic RFC 4180 compliant CSV line parser supporting quoted strings and commas.
 */
export function parseCSVText(csvContent: string): { headers: string[]; rows: string[][] } {
  if (!csvContent || !csvContent.trim()) {
    return { headers: [], rows: [] };
  }

  const lines: string[] = [];
  let currentField = "";
  let inQuotes = false;
  let currentRow: string[] = [];
  const allRows: string[][] = [];

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    const nextChar = csvContent[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      currentField = "";
      // Only push non-empty rows
      if (currentRow.some((field) => field.length > 0)) {
        allRows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Handle remaining field
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      allRows.push(currentRow);
    }
  }

  if (allRows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = allRows[0].map((h) => h.replace(/^["'\s]+|["'\s]+$/g, ""));
  const rows = allRows.slice(1);

  return { headers, rows };
}

/**
 * Auto-detects the best column matching for standard fields.
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    name: "",
    phone: "",
  };

  const lower = headers.map((h) => h.toLowerCase().trim());

  lower.forEach((header, idx) => {
    const raw = headers[idx];
    if (!mapping.name && (header.includes("name") || header.includes("contact") || header.includes("student"))) {
      mapping.name = raw;
    } else if (
      !mapping.phone &&
      (header.includes("phone") || header.includes("mobile") || header.includes("whatsapp") || header.includes("contact no") || header.includes("number"))
    ) {
      mapping.phone = raw;
    } else if (!mapping.email && header.includes("email")) {
      mapping.email = raw;
    } else if (
      !mapping.roleOrGrade &&
      (header.includes("role") || header.includes("grade") || header.includes("class") || header.includes("batch") || header.includes("type"))
    ) {
      mapping.roleOrGrade = raw;
    } else if (
      !mapping.group &&
      (header.includes("group") || header.includes("tag") || header.includes("section"))
    ) {
      mapping.group = raw;
    } else if (!mapping.consentStatus && (header.includes("consent") || header.includes("permission") || header.includes("opt"))) {
      mapping.consentStatus = raw;
    } else if (!mapping.notes && (header.includes("note") || header.includes("remark") || header.includes("info"))) {
      mapping.notes = raw;
    }
  });

  // Fallback defaults if not matched
  if (!mapping.name && headers.length > 0) mapping.name = headers[0];
  if (!mapping.phone && headers.length > 1) mapping.phone = headers[1];

  return mapping;
}

/**
 * Validates each row individually without dropping the entire dataset.
 */
export function validateCSVRows(
  headers: string[],
  rows: string[][],
  mapping: ColumnMapping,
  defaultCountryCode = "91"
): CSVRowValidation[] {
  const validatedRows: CSVRowValidation[] = [];
  const seenPhones = new Set<string>();

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // header is row 1
    const rawMap: Record<string, string> = {};
    headers.forEach((h, hIdx) => {
      rawMap[h] = row[hIdx] ?? "";
    });

    const nameVal = (rawMap[mapping.name] || "").trim();
    const phoneVal = (rawMap[mapping.phone] || "").trim();
    const emailVal = mapping.email ? (rawMap[mapping.email] || "").trim() : "";
    const roleVal = mapping.roleOrGrade ? (rawMap[mapping.roleOrGrade] || "").trim() : "";
    const notesVal = mapping.notes ? (rawMap[mapping.notes] || "").trim() : "";
    const groupVal = mapping.group ? (rawMap[mapping.group] || "").trim() : "";
    const consentVal = mapping.consentStatus ? (rawMap[mapping.consentStatus] || "").trim() : "";

    const errors: string[] = [];

    if (!nameVal) {
      errors.push("Name is required.");
    }

    const phoneResult = normalizePhoneNumber(phoneVal, defaultCountryCode);
    if (!phoneResult.isValid) {
      errors.push(phoneResult.error || "Invalid phone number format.");
    } else if (seenPhones.has(phoneResult.normalized)) {
      errors.push(`Duplicate phone number within this CSV (${phoneResult.normalized}).`);
    } else {
      seenPhones.add(phoneResult.normalized);
    }

    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      errors.push(`Invalid email address format: ${emailVal}`);
    }

    let parsedConsent: ConsentStatus = "GRANTED";
    if (consentVal) {
      const lowerConsent = consentVal.toLowerCase();
      if (lowerConsent.includes("revok") || lowerConsent.includes("no") || lowerConsent.includes("false") || lowerConsent.includes("opt-out")) {
        parsedConsent = "REVOKED";
      } else if (lowerConsent.includes("pend") || lowerConsent.includes("wait")) {
        parsedConsent = "PENDING";
      }
    }

    const groupNames = groupVal
      ? groupVal
          .split(/[,;|]/)
          .map((g) => g.trim())
          .filter(Boolean)
      : [];

    validatedRows.push({
      rowNumber,
      raw: rawMap,
      isValid: errors.length === 0,
      errors,
      parsed: {
        name: nameVal,
        phone: phoneResult.normalized,
        email: emailVal || undefined,
        roleOrGrade: roleVal || undefined,
        notes: notesVal || undefined,
        consentStatus: parsedConsent,
        groupNames,
      },
    });
  });

  return validatedRows;
}
