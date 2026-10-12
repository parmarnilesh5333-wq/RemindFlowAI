import { describe, it, expect } from "vitest";
import { WhatsAppCloudAdapter } from "../src/lib/whatsapp-adapter";
import { normalizePhoneNumber } from "../src/lib/phone";

describe("Inbound WhatsApp Webhook & Opt-Out Processing", () => {
  const OPTOUT_KEYWORDS = [
    "STOP",
    "UNSUBSCRIBE",
    "CANCEL",
    "END",
    "QUIT",
    "OPTOUT",
    "OPT-OUT",
    "STOPPROMO",
  ];

  function isOptOutMessage(text: string): boolean {
    const textUpper = text.trim().toUpperCase();
    return OPTOUT_KEYWORDS.some(
      (kw) => textUpper === kw || textUpper.startsWith(kw + " ")
    );
  }

  it("parses inbound text messages from Meta Cloud webhook payload", () => {
    const mockWebhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID_123",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "15551234567",
                  phone_number_id: "PHONE_ID_123",
                },
                contacts: [
                  {
                    profile: { name: "Aarav Patel" },
                    wa_id: "919876543201",
                  },
                ],
                messages: [
                  {
                    from: "919876543201",
                    id: "wamid.HBgLOTE5ODc2NTQzMjAxFQIAEhgWM0VCMDEyMzQ1Njc4OABC",
                    timestamp: "1760000000",
                    text: {
                      body: "STOP",
                    },
                    type: "text",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const messages = WhatsAppCloudAdapter.parseWebhookMessages(mockWebhookPayload);
    expect(messages.length).toBe(1);
    expect(messages[0].from).toBe("919876543201");
    expect(messages[0].text).toBe("STOP");
    expect(messages[0].messageId).toBe("wamid.HBgLOTE5ODc2NTQzMjAxFQIAEhgWM0VCMDEyMzQ1Njc4OABC");
    expect(messages[0].timestamp).toBeInstanceOf(Date);
  });

  it("identifies opt-out keywords regardless of case or leading/trailing whitespace", () => {
    expect(isOptOutMessage("STOP")).toBe(true);
    expect(isOptOutMessage("stop")).toBe(true);
    expect(isOptOutMessage("  Stop  ")).toBe(true);
    expect(isOptOutMessage("UNSUBSCRIBE")).toBe(true);
    expect(isOptOutMessage("unsubscribe")).toBe(true);
    expect(isOptOutMessage("cancel")).toBe(true);
    expect(isOptOutMessage("QUIT")).toBe(true);
    expect(isOptOutMessage("opt-out")).toBe(true);
    expect(isOptOutMessage("STOP please do not send more messages")).toBe(true);
  });

  it("does not classify regular recipient inquiries as opt-outs", () => {
    expect(isOptOutMessage("Thank you for the reminder")).toBe(false);
    expect(isOptOutMessage("Can I pay online?")).toBe(false);
    expect(isOptOutMessage("Okay, I will attend the PTM")).toBe(false);
    expect(isOptOutMessage("Hello")).toBe(false);
    expect(isOptOutMessage("Never stop learning")).toBe(false); // Does not start with "STOP"
  });

  it("normalizes sender phone numbers from Meta webhook format", () => {
    const rawSender = "919876543201";
    const res = normalizePhoneNumber(rawSender);
    expect(res.isValid).toBe(true);
    expect(res.normalized).toBe("+919876543201");
  });
});
