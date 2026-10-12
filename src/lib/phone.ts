/**
 * Phone number validation and normalization utility.
 * Normalizes phone numbers to standard E.164 format.
 */

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string;
  original: string;
  error?: string;
}

export function normalizePhoneNumber(
  input: string | null | undefined,
  defaultCountryCode = "91"
): PhoneValidationResult {
  if (!input || typeof input !== "string") {
    return {
      isValid: false,
      normalized: "",
      original: input || "",
      error: "Phone number is empty or missing.",
    };
  }

  const original = input.trim();
  // Strip out all non-digit and non-plus characters
  let cleaned = original.replace(/[^\d+]/g, "");

  if (!cleaned) {
    return {
      isValid: false,
      normalized: "",
      original,
      error: "Phone number contains no numeric digits.",
    };
  }

  // Handle leading zeros or 00 prefix (e.g. 0091 -> +91)
  if (cleaned.startsWith("00")) {
    cleaned = "+" + cleaned.slice(2);
  } else if (cleaned.startsWith("0") && cleaned.length > 10) {
    cleaned = cleaned.replace(/^0+/, "");
  }

  let normalized = cleaned;

  if (cleaned.startsWith("+")) {
    const digitsOnly = cleaned.slice(1);
    if (!/^\d+$/.test(digitsOnly)) {
      return {
        isValid: false,
        normalized: "",
        original,
        error: "Invalid international phone format.",
      };
    }
    normalized = cleaned;
  } else {
    // If 10 digits without '+', apply default country code
    if (cleaned.length === 10) {
      normalized = `+${defaultCountryCode}${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith("0")) {
      // e.g. 09876543210 -> +919876543210
      normalized = `+${defaultCountryCode}${cleaned.slice(1)}`;
    } else if (cleaned.length > 10 && cleaned.startsWith(defaultCountryCode)) {
      // e.g. 919876543210 -> +919876543210
      normalized = `+${cleaned}`;
    } else {
      normalized = `+${cleaned}`;
    }
  }

  // Validate E.164 format: + followed by 8 to 15 digits
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  const isValid = e164Regex.test(normalized);

  if (!isValid) {
    return {
      isValid: false,
      normalized,
      original,
      error: `Invalid phone format (${normalized}). Must be 8-15 digits starting with country code.`,
    };
  }

  return {
    isValid: true,
    normalized,
    original,
  };
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return "";
  if (phone.startsWith("+91") && phone.length === 13) {
    return `+91 ${phone.slice(3, 8)} ${phone.slice(8)}`;
  }
  if (phone.startsWith("+1") && phone.length === 12) {
    return `+1 (${phone.slice(2, 5)}) ${phone.slice(5, 8)}-${phone.slice(8)}`;
  }
  return phone;
}
