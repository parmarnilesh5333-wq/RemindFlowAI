import { describe, it, expect } from "vitest";
import { WhatsAppCloudAdapter } from "../src/lib/whatsapp-adapter";

describe("Official WhatsApp Cloud API Adapter", () => {
  it("defaults to visibly labeled Simulation Mode when credentials are empty", () => {
    const config = WhatsAppCloudAdapter.getConfigStatus();
    expect(config.isSimulationMode).toBe(true);
    expect(config.isConfigured).toBe(false);
    expect(config.missingFields).toContain("WHATSAPP_API_TOKEN");
  });

  it("dispatches in simulation mode with simulated ID and explicit disclosure", async () => {
    const result = await WhatsAppCloudAdapter.sendMessage({
      toPhone: "+919876543210",
      messageText: "Test message",
    });

    expect(result.success).toBe(true);
    expect(result.isSimulated).toBe(true);
    expect(result.messageId).toMatch(/^sim_wamid_/);
    expect(result.rawResponse?.notice).toContain("SIMULATED DISPATCH");
  });

  it("verifies webhook challenge subscription with correct secret token", () => {
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "test_custom_secret_123";

    const validChallenge = WhatsAppCloudAdapter.verifyWebhookSubscription(
      "subscribe",
      "test_custom_secret_123",
      "challenge_token_456"
    );
    expect(validChallenge).toBe("challenge_token_456");

    const invalidToken = WhatsAppCloudAdapter.verifyWebhookSubscription(
      "subscribe",
      "wrong_secret",
      "challenge_token_456"
    );
    expect(invalidToken).toBeNull();
  });

  it("parses incoming webhook delivery status payloads", () => {
    const webhookPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_ID",
          changes: [
            {
              value: {
                messaging_product: "whatsapp",
                metadata: { phone_number_id: "PHONE_ID" },
                statuses: [
                  {
                    id: "wamid.HBgLMTIz",
                    status: "delivered",
                    timestamp: "1728564000",
                    recipient_id: "919876543210",
                  },
                ],
              },
              field: "messages",
            },
          ],
        },
      ],
    };

    const parsed = WhatsAppCloudAdapter.parseWebhookStatuses(webhookPayload);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].messageId).toBe("wamid.HBgLMTIz");
    expect(parsed[0].status).toBe("delivered");
    expect(parsed[0].recipientId).toBe("919876543210");
  });

  it("redacts sensitive tokens and secrets from logged payloads", () => {
    const rawPayload = {
      access_token: "EAABwzL184...secret",
      status: "success",
      sub_object: {
        token: "very_secret_bearer_token",
        phone: "+919876543210",
      },
    };

    const masked = WhatsAppCloudAdapter.maskLogPayload(rawPayload);
    expect(masked.access_token).toBe("[REDACTED_SECRET]");
    expect(masked.sub_object.token).toBe("[REDACTED_SECRET]");
    expect(masked.sub_object.phone).toBe("+919876543210");
  });
});
