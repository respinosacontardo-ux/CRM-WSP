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
   * `t=<unix_seconds>,s=<signature>`. The signed payload is
   * `{timestamp}.{raw_body}` and the HMAC is SHA-256 with the webhook secret.
   * See https://docs.ycloud.com/reference/webhook-integration-guide
   *
   * YCloud's secret carries a `whsec_` prefix (Svix-style). The exact byte
   * handling (raw string vs base64-decoded key, hex vs base64 output) is not
   * fully explicit in the docs, so we accept the signature if it matches ANY
   * of the plausible encodings of the SAME secret. This stays secure — every
   * candidate still requires knowledge of the secret — while avoiding a
   * fail-closed rejection of legitimate messages due to an encoding mismatch.
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
    // Some senders prefix the signature with a version, e.g. "v1,<sig>".
    const provided = (parts['s'] ?? '').replace(/^v\d+,/, '').trim();
    if (!timestamp || !provided) return false;

    // Replay protection: reject timestamps outside a 5-minute window.
    const tsSeconds = parseInt(timestamp, 10);
    if (!Number.isFinite(tsSeconds)) return false;
    if (Math.abs(Date.now() / 1000 - tsSeconds) > 300) return false;

    // signed_payload = "{timestamp}.{raw_body}" (kept as bytes for exactness).
    const signedPayload = Buffer.concat([Buffer.from(`${timestamp}.`), rawBody]);

    // Candidate keys derived from the secret.
    const secretNoPrefix = secret.replace(/^whsec_/, '');
    const keyCandidates: Buffer[] = [
      Buffer.from(secret, 'utf8'), // whole "whsec_..." string
      Buffer.from(secretNoPrefix, 'utf8'), // after the prefix
    ];
    try {
      keyCandidates.push(Buffer.from(secretNoPrefix, 'base64')); // Svix-style key
    } catch {
      /* ignore invalid base64 */
    }

    for (const key of keyCandidates) {
      const digest = createHmac('sha256', key).update(signedPayload).digest();
      for (const encoded of [digest.toString('hex'), digest.toString('base64')]) {
        const a = Buffer.from(encoded, 'utf8');
        const b = Buffer.from(provided, 'utf8');
        if (a.length === b.length && timingSafeEqual(a, b)) return true;
      }
    }
    return false;
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
