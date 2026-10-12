export type ConsentStatus = "GRANTED" | "REVOKED" | "PENDING";

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type RecipientStatus =
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED"
  | "OPTED_OUT_SKIPPED";

export type SupportedLanguage = "English" | "Gujarati" | "Hindi";

export const LANGUAGE_OPTIONS = [
  { value: "English", label: "English", nativeLabel: "English" },
  { value: "Gujarati", label: "ગુજરાતી (Gujarati)", nativeLabel: "ગુજરાતી" },
  { value: "Hindi", label: "हिंदी (Hindi)", nativeLabel: "हिंदी" },
] as const;

export interface ContactData {
  id?: string;
  name: string;
  phone: string;
  email?: string | null;
  roleOrGrade?: string | null;
  notes?: string | null;
  consentStatus?: ConsentStatus;
  consentSource?: string | null;
  optOutStatus?: boolean;
  optOutReason?: string | null;
  groups?: string[]; // group IDs or names
}

export interface CSVRowValidation {
  rowNumber: number;
  raw: Record<string, string>;
  parsed?: {
    name: string;
    phone: string;
    email?: string;
    roleOrGrade?: string;
    notes?: string;
    consentStatus: ConsentStatus;
    groupNames: string[];
  };
  isValid: boolean;
  errors: string[];
}

export interface CSVImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedContacts: number;
  updatedContacts: number;
  skippedDuplicates: number;
  errors: Array<{ rowNumber: number; errors: string[] }>;
}

export interface AIReminderExtraction {
  campaignName: string;
  targetGroup: string;
  targetGroupId?: string;
  matchedGroupExact: boolean;
  message: string;
  language: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  timezone: string;
  scheduledIsoString: string;
  variables: string[];
  missingInformation: string[];
  isDemoMode: boolean;
  aiProviderName: string;
  explanation: string;
  hasAudienceConflict?: boolean;
  audienceConflictWarning?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  status: "SENT" | "FAILED" | "QUEUED";
  isSimulated: boolean;
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: any;
}
