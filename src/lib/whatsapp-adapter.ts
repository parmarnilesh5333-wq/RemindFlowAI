import { WhatsAppSendResult } from "./types";

export interface WhatsAppConfigStatus {
  isConfigured: boolean;
  isSimulationMode: boolean;
  phoneNumberIdMasked?: string;
  wabaIdMasked?: string;
  hasApiToken: boolean;
  hasVerifyToken: boolean;
  missingFields: string[];
}

export interface SendMessagePayload {
  toPhone: string; // E.164 formatted (+919876543210)
  messageText: string;
  templateName?: string;
  templateLanguage?: string;
  templateParameters?: Array<{ type: string; text: string }>;
}

/**
 * Official Meta WhatsApp Business Cloud API Server-Side Adapter.
 * Conforms strictly to Meta Graph API v20.0 standards.
 * Falls back safely to a labeled Simulation Mode when credentials are not configured.
 */
export class WhatsAppCloudAdapter {
  private static apiVersion = "v20.0";

  public static getConfigStatus(): WhatsAppConfigStatus {
    const token = process.env.WHATSAPP_API_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

    const missing: string[] = [];
    if (!token || token.includes("your_meta") || token.length < 10) missing.push("WHATSAPP_API_TOKEN");
    if (!phoneId || phoneId.includes("your_whatsapp")) missing.push("WHATSAPP_PHONE_NUMBER_ID");
    if (!wabaId || wabaId.includes("your_whatsapp")) missing.push("WHATSAPP_BUSINESS_ACCOUNT_ID");
    if (!verifyToken || verifyToken.includes("your_custom")) missing.push("WHATSAPP_WEBHOOK_VERIFY_TOKEN");

    const isConfigured = missing.length === 0;

    return {
      isConfigured,
      isSimulationMode: !isConfigured,
      phoneNumberIdMasked: phoneId ? this.maskString(phoneId, 3) : undefined,
      wabaIdMasked: wabaId ? this.maskString(wabaId, 3) : undefined,
      hasApiToken: Boolean(token && token.length > 10 && !token.includes("your_meta")),
      hasVerifyToken: Boolean(verifyToken && !verifyToken.includes("your_custom")),
      missingFields: missing,
    };
  }

  /**
   * Dispatches a message through Meta WhatsApp Cloud API or marks as simulated.
   */
  public static async sendMessage(payload: SendMessagePayload): Promise<WhatsAppSendResult> {
    const config = this.getConfigStatus();

    // Clean destination phone to numeric digits only for Meta API
    const recipientDigits = payload.toPhone.replace(/[^\d]/g, "");

    if (config.isSimulationMode) {
      // VISIBLY LABELED SIMULATION MODE
      // Never claims simulated message was actually sent through Meta servers
      const mockMessageId = `sim_wamid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Simulate minor network latency (30-80ms)
      await new Promise((r) => setTimeout(r, 40));

      return {
        success: true,
        messageId: mockMessageId,
        status: "SENT",
        isSimulated: true,
        rawResponse: {
          messaging_product: "whatsapp",
          simulation: true,
          notice: "SIMULATED DISPATCH: Meta WhatsApp API credentials are not configured. No real message transmitted.",
          contacts: [{ input: recipientDigits, wa_id: recipientDigits }],
          messages: [{ id: mockMessageId }],
        },
      };
    }

    // LIVE META GRAPH API CALL
    const token = process.env.WHATSAPP_API_TOKEN!;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    const url = `https://graph.facebook.com/${this.apiVersion}/${phoneId}/messages`;

    // Build standard Meta request body
    let requestBody: any;

    if (payload.templateName) {
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientDigits,
        type: "template",
        template: {
          name: payload.templateName,
          language: { code: payload.templateLanguage || "en_US" },
          components: payload.templateParameters
            ? [
                {
                  type: "body",
                  parameters: payload.templateParameters,
                },
              ]
            : [],
        },
      };
    } else {
      requestBody = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientDigits,
        type: "text",
        text: {
          preview_url: false,
          body: payload.messageText,
        },
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorDetail = responseData.error || {};
        return {
          success: false,
          status: "FAILED",
          isSimulated: false,
          errorCode: String(errorDetail.code || response.status),
          errorMessage: errorDetail.message || `Meta Cloud API error (${response.status})`,
          rawResponse: this.maskLogPayload(responseData),
        };
      }

      const messageId = responseData.messages?.[0]?.id || `wamid_${Date.now()}`;
      return {
        success: true,
        messageId,
        status: "SENT",
        isSimulated: false,
        rawResponse: this.maskLogPayload(responseData),
      };
    } catch (err: any) {
      return {
        success: false,
        status: "FAILED",
        isSimulated: false,
        errorCode: "NETWORK_EXCEPTION",
        errorMessage: err.message || "Failed to reach Meta Cloud API endpoint.",
        rawResponse: { error: err.message },
      };
    }
  }

  /**
   * Verifies incoming Meta Webhook handshake challenge
   */
  public static verifyWebhookSubscription(
    mode: string | null,
    token: string | null,
    challenge: string | null
  ): string | null {
    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (mode === "subscribe" && token === expectedToken && challenge) {
      return challenge;
    }
    return null;
  }

  /**
   * Parses official incoming status update from Meta webhook payload
   */
  public static parseWebhookStatuses(payload: any): Array<{
    messageId: string;
    status: "sent" | "delivered" | "read" | "failed";
    timestamp: Date;
    recipientId: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    const results: Array<any> = [];

    if (!payload?.entry || !Array.isArray(payload.entry)) return results;

    for (const entry of payload.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        const statuses = value.statuses || [];
        for (const st of statuses) {
          const rawStatus = st.status?.toLowerCase();
          let normalizedStatus: "sent" | "delivered" | "read" | "failed" | null = null;

          if (rawStatus === "sent") normalizedStatus = "sent";
          else if (rawStatus === "delivered") normalizedStatus = "delivered";
          else if (rawStatus === "read") normalizedStatus = "read";
          else if (rawStatus === "failed") normalizedStatus = "failed";

          if (normalizedStatus && st.id) {
            results.push({
              messageId: st.id,
              status: normalizedStatus,
              timestamp: st.timestamp ? new Date(parseInt(st.timestamp, 10) * 1000) : new Date(),
              recipientId: st.recipient_id || "",
              errorCode: st.errors?.[0]?.code ? String(st.errors[0].code) : undefined,
              errorMessage: st.errors?.[0]?.title || st.errors?.[0]?.message,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Parses official incoming user messages from Meta webhook payload
   * (e.g. opt-out keywords: STOP, CANCEL, UNSUBSCRIBE)
   */
  public static parseWebhookMessages(payload: any): Array<{
    messageId: string;
    from: string;
    text: string;
    timestamp: Date;
    type: string;
  }> {
    const results: Array<{
      messageId: string;
      from: string;
      text: string;
      timestamp: Date;
      type: string;
    }> = [];

    if (!payload?.entry || !Array.isArray(payload.entry)) return results;

    for (const entry of payload.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const value = change.value;
        if (!value) continue;

        const messages = value.messages || [];
        for (const msg of messages) {
          if (!msg) continue;
          const textBody =
            typeof msg.text === "object"
              ? msg.text?.body || ""
              : typeof msg.text === "string"
              ? msg.text
              : msg.button?.text || "";

          const from = msg.from ? String(msg.from) : "";
          if (from) {
            results.push({
              messageId: msg.id || "",
              from,
              text: textBody,
              timestamp: msg.timestamp ? new Date(parseInt(msg.timestamp, 10) * 1000) : new Date(),
              type: msg.type || "text",
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * Redacts sensitive secrets and tokens before logging to DB or stdout
   */
  public static maskLogPayload(payload: any): any {
    if (!payload || typeof payload !== "object") return payload;
    const copy = JSON.parse(JSON.stringify(payload));

    const sensitiveKeys = ["token", "authorization", "password", "secret", "access_token"];
    const redact = (obj: any) => {
      for (const key of Object.keys(obj)) {
        if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
          obj[key] = "[REDACTED_SECRET]";
        } else if (typeof obj[key] === "object" && obj[key] !== null) {
          redact(obj[key]);
        }
      }
    };

    redact(copy);
    return copy;
  }

  private static maskString(str: string, visibleChars = 4): string {
    if (str.length <= visibleChars) return "***";
    return `${str.slice(0, visibleChars)}...${str.slice(-visibleChars)}`;
  }
}
