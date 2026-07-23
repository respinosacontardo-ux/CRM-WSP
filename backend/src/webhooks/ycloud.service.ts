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
   * Verifies the signature of an incoming YCloud webhook.
   *
   * YCloud signs with the `YCloud-Signature` header, formatted as
   * `t=<unix_seconds>,s=<hex_hmac>`. The signed payload is
   * `{timestamp}.{raw_body}` and the HMAC is SHA-256 with the webhook secret.
   * See https://docs.ycloud.com/reference/webhook-integration-guide
   *
   * FAIL-CLOSED: if no secret is configured, returns false (reject everything).
   */
  verifySignature(rawBody: Buffer | undefined, signatureHeader: string | undefined): boolean {
    const secret = this.webhookSecret;
    if (!secret) return false; // fail-closed
    if (!rawBody || !signatureHeader) return false;

    // Parse "t=...,s=..." into its parts.
    const parts: Record<string, string> = {};
    for (const segment of signatureHeader.split(',')) {
      const idx = segment.indexOf('=');
      if (idx === -1) continue;
      parts[segment.slice(0, idx).trim()] = segment.slice(idx + 1).trim();
    }
    const timestamp = parts['t'];
    const provided = parts['s'];
    if (!timestamp || !provided) return false;

    // Replay protection: reject timestamps outside a 5-minute window.
    const tsSeconds = parseInt(timestamp, 10);
    if (!Number.isFinite(tsSeconds)) return false;
    if (Math.abs(Date.now() / 1000 - tsSeconds) > 300) return false;

    // signed_payload = "{timestamp}.{raw_body}" (kept as bytes for exactness).
    const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]);
    const expected = createHmac('sha256', secret).update(signedPayload).digest('hex');

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
