import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WhatsAppCloudAdapter } from "@/lib/whatsapp-adapter";
import { normalizePhoneNumber } from "@/lib/phone";
import { recordAuditLog } from "@/lib/audit";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifiedChallenge = WhatsAppCloudAdapter.verifyWebhookSubscription(mode, token, challenge);

  if (verifiedChallenge) {
    return new NextResponse(verifiedChallenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden: Webhook verification failed." }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // 1. Process delivery status callbacks
    const statuses = WhatsAppCloudAdapter.parseWebhookStatuses(payload);

    for (const st of statuses) {
      // Find matching campaign recipient
      const recipient = await prisma.campaignRecipient.findFirst({
        where: { providerMessageId: st.messageId },
      });

      if (recipient) {
        let recipientStatus = recipient.status;
        const updateData: any = {};

        if (st.status === "sent") {
          recipientStatus = "SENT";
          updateData.sentAt = st.timestamp;
        } else if (st.status === "delivered") {
          recipientStatus = "DELIVERED";
          updateData.deliveredAt = st.timestamp;
        } else if (st.status === "read") {
          recipientStatus = "READ";
          updateData.readAt = st.timestamp;
        } else if (st.status === "failed") {
          recipientStatus = "FAILED";
          updateData.errorMessage = st.errorMessage || "Delivery failed by carrier";
          updateData.errorCode = st.errorCode || "CARRIER_ERROR";
        }

        updateData.status = recipientStatus;

        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: updateData,
        });

        // Record inbound delivery status log
        await prisma.messageLog.create({
          data: {
            campaignId: recipient.campaignId,
            recipientId: recipient.id,
            phone: recipient.phoneSnapshot,
            direction: "INBOUND_STATUS",
            status: recipientStatus,
            payloadMasked: JSON.stringify({
              messageId: st.messageId,
              status: st.status,
              timestamp: st.timestamp,
              errorCode: st.errorCode,
            }),
          },
        });
      }
    }

    // 2. Process inbound user messages (STOP / Opt-out keywords)
    const incomingMessages = WhatsAppCloudAdapter.parseWebhookMessages(payload);

    for (const msg of incomingMessages) {
      const cleanPhoneRes = normalizePhoneNumber(msg.from);
      const normalizedPhone = cleanPhoneRes.isValid
        ? cleanPhoneRes.normalized
        : msg.from.startsWith("+")
        ? msg.from
        : `+${msg.from}`;

      const textUpper = msg.text.trim().toUpperCase();
      const isOptOut = OPTOUT_KEYWORDS.some(
        (kw) => textUpper === kw || textUpper.startsWith(kw + " ")
      );

      if (isOptOut) {
        // Idempotently record global opt-out
        await prisma.optOut.upsert({
          where: { phone: normalizedPhone },
          create: {
            phone: normalizedPhone,
            reason: `Opted out via inbound WhatsApp message "${msg.text.trim()}"`,
            source: "KEYWORD_STOP",
            timestamp: msg.timestamp,
          },
          update: {
            reason: `Opted out via inbound WhatsApp message "${msg.text.trim()}"`,
            timestamp: msg.timestamp,
          },
        });

        // Revoke consent for all matching contact records
        const matchingContacts = await prisma.contact.findMany({
          where: {
            OR: [
              { phone: normalizedPhone },
              { phone: msg.from },
              { phone: msg.from.replace(/[^\d]/g, "") },
            ],
          },
        });

        for (const contact of matchingContacts) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              consentStatus: "REVOKED",
              optOutStatus: true,
            },
          });

          await prisma.consentRecord.create({
            data: {
              contactId: contact.id,
              status: "REVOKED",
              source: "WHATSAPP_INBOUND_STOP",
              notes: `Opted out via inbound WhatsApp message: "${msg.text.trim()}"`,
              timestamp: msg.timestamp,
            },
          });
        }

        // Record inbound message log
        await prisma.messageLog.create({
          data: {
            phone: normalizedPhone,
            direction: "INBOUND_MESSAGE",
            status: "OPT_OUT",
            payloadMasked: JSON.stringify({
              from: msg.from,
              text: msg.text,
              type: msg.type,
              messageId: msg.messageId,
              action: "OPTOUT_REVOKED",
            }),
          },
        });

        // Audit log entry
        await recordAuditLog({
          action: "OPTOUT_REGISTERED",
          entityType: "OptOut",
          details: {
            phone: normalizedPhone,
            keyword: msg.text.trim(),
            affectedContacts: matchingContacts.map((c) => c.id),
          },
        });
      } else {
        // Normal inbound message log
        await prisma.messageLog.create({
          data: {
            phone: normalizedPhone,
            direction: "INBOUND_MESSAGE",
            status: "RECEIVED",
            payloadMasked: JSON.stringify({
              from: msg.from,
              text: msg.text,
              type: msg.type,
              messageId: msg.messageId,
            }),
          },
        });
      }
    }

    return NextResponse.json({
      received: true,
      processedStatuses: statuses.length,
      processedMessages: incomingMessages.length,
    });
  } catch (error: any) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
