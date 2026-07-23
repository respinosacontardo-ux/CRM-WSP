import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Thin client for the YCloud WhatsApp API. Credentials come from env only
 * (never from the UI): YCLOUD_API_KEY, YCLOUD_WEBHOOK_SECRET, YCLOUD_WHATSAPP_NUMBER.
 */
@Injectable()
export class YCloudService {
  private readonly logger = new Logger(YCloudService.name);

  get isConfigured(): boolean {
    return !!process.env.YCLOUD_API_KEY && !!process.env.YCLOUD_WHATSAPP_NUMBER;
  }

  get webhookSecret(): string | undefined {
    return process.env.YCLOUD_WEBHOOK_SECRET || undefined;
  }

  /**
   * Verifies the HMAC-SHA256 signature of an incoming webhook.
   * FAIL-CLOSED: if no secret is configured, returns false (reject everything).
   */
  verifySignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): boolean {
    const secret = this.webhookSecret;
    if (!secret) return false; // fail-closed
    if (!rawBody || !signatureHeader) return false;

    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    // Accept either a raw hex digest or a "sha256=" prefixed value.
    const provided = signatureHeader.replace(/^sha256=/i, '').trim();

    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(provided, 'utf8');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  /** Sends a plain-text WhatsApp message via YCloud. */
  async sendText(to: string, body: string): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn('YCloud not configured; skipping outbound message.');
      return;
    }
    try {
      const res = await fetch('https://api.ycloud.com/v2/whatsapp/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.YCLOUD_API_KEY as string,
        },
        body: JSON.stringify({
          from: process.env.YCLOUD_WHATSAPP_NUMBER,
          to,
          type: 'text',
          text: { body },
        }),
      });
      if (!res.ok) {
        // Do not log the message body (PII); log only status.
        this.logger.error(`YCloud send failed with status ${res.status}`);
      }
    } catch (err) {
      this.logger.error(`YCloud send error: ${(err as Error).message}`);
    }
  }
}
