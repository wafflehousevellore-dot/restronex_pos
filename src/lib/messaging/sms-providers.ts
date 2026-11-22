export interface SmsSendPayload {
  recipientPhone: string;
  messageText: string;
  senderId?: string;
  dltTemplateId?: string;
}

export interface SmsProviderConfig {
  provider: "FAST2SMS" | "MSG91" | "TWILIO" | "MOCK";
  apiKey?: string;
  senderId?: string;
  templateId?: string;
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface SmsSendResult {
  ok: boolean;
  status: "SENT" | "DELIVERED" | "FAILED" | "NOT_CONFIGURED";
  messageId?: string;
  provider: "FAST2SMS" | "MSG91" | "TWILIO" | "MOCK";
  error?: string;
}

export interface SmsProvider {
  name: "FAST2SMS" | "MSG91" | "TWILIO" | "MOCK";
  send(payload: SmsSendPayload, config: SmsProviderConfig): Promise<SmsSendResult>;
}

export class MockSmsProvider implements SmsProvider {
  name = "MOCK" as const;
  private static sentMessages: Array<{
    payload: SmsSendPayload;
    sentAt: Date;
    messageId: string;
  }> = [];

  async send(payload: SmsSendPayload): Promise<SmsSendResult> {
    const messageId = `sms_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    MockSmsProvider.sentMessages.push({
      payload,
      sentAt: new Date(),
      messageId,
    });
    return {
      ok: true,
      status: "SENT",
      messageId,
      provider: "MOCK",
    };
  }

  static getSentMessages() {
    return this.sentMessages;
  }

  static clearSentMessages() {
    this.sentMessages = [];
  }
}

export class Fast2SmsProvider implements SmsProvider {
  name = "FAST2SMS" as const;

  async send(payload: SmsSendPayload, config: SmsProviderConfig): Promise<SmsSendResult> {
    if (!config.apiKey) {
      return {
        ok: false,
        status: "NOT_CONFIGURED",
        provider: "FAST2SMS",
        error: "Fast2SMS API key not configured",
      };
    }

    try {
      // Strips country code for domestic India route
      const cleanPhone = payload.recipientPhone.replace(/\D/g, "").slice(-10);

      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: config.templateId ? "dlt" : "q",
          message: payload.messageText,
          numbers: cleanPhone,
          flash: 0,
          sender_id: config.senderId,
          message_id: config.templateId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.return === true || data.status_code === 200)) {
        const messageId = Array.isArray(data.message_id) ? data.message_id[0] : `f2s_${Date.now()}`;
        return {
          ok: true,
          status: "SENT",
          messageId: String(messageId),
          provider: "FAST2SMS",
        };
      }

      return {
        ok: false,
        status: "FAILED",
        provider: "FAST2SMS",
        error: data.message || `Fast2SMS HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        status: "FAILED",
        provider: "FAST2SMS",
        error: err.message || "Network error contacting Fast2SMS",
      };
    }
  }
}

export class Msg91Provider implements SmsProvider {
  name = "MSG91" as const;

  async send(payload: SmsSendPayload, config: SmsProviderConfig): Promise<SmsSendResult> {
    if (!config.apiKey) {
      return {
        ok: false,
        status: "NOT_CONFIGURED",
        provider: "MSG91",
        error: "MSG91 AuthKey not configured",
      };
    }

    try {
      const cleanPhone = payload.recipientPhone.replace(/\D/g, "");
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: {
          authkey: config.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: config.templateId || "DEFAULT",
          sender: config.senderId || "RSTRNX",
          short_url: "0",
          mobiles: cleanPhone,
          body: payload.messageText,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && (data.type === "success" || data.status === "success")) {
        return {
          ok: true,
          status: "SENT",
          messageId: data.message || `msg91_${Date.now()}`,
          provider: "MSG91",
        };
      }

      return {
        ok: false,
        status: "FAILED",
        provider: "MSG91",
        error: data.message || `MSG91 HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        status: "FAILED",
        provider: "MSG91",
        error: err.message || "Network error contacting MSG91",
      };
    }
  }
}

export class TwilioProvider implements SmsProvider {
  name = "TWILIO" as const;

  async send(payload: SmsSendPayload, config: SmsProviderConfig): Promise<SmsSendResult> {
    if (!config.accountSid || !config.authToken || !config.fromNumber) {
      return {
        ok: false,
        status: "NOT_CONFIGURED",
        provider: "TWILIO",
        error: "Twilio SID/AuthToken/FromNumber not configured",
      };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
      const params = new URLSearchParams({
        To: payload.recipientPhone,
        From: config.fromNumber,
        Body: payload.messageText,
      });

      const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sid) {
        return {
          ok: true,
          status: "SENT",
          messageId: data.sid,
          provider: "TWILIO",
        };
      }

      return {
        ok: false,
        status: "FAILED",
        provider: "TWILIO",
        error: data.message || `Twilio HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        ok: false,
        status: "FAILED",
        provider: "TWILIO",
        error: err.message || "Network error contacting Twilio",
      };
    }
  }
}

export function getSmsProvider(providerType: string): SmsProvider {
  switch (providerType?.toUpperCase()) {
    case "FAST2SMS":
      return new Fast2SmsProvider();
    case "MSG91":
      return new Msg91Provider();
    case "TWILIO":
      return new TwilioProvider();
    case "MOCK":
    default:
      return new MockSmsProvider();
  }
}
