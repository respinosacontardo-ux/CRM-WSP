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
   * YCloud's webhook secret carries a `whsec_` prefix (Svix / "Standard
   * Webhooks" lineage) and the exact wire format is not fully pinned down in
   * the docs. To avoid a fail-closed rejection of legitimate messages due to a
   * format mismatch, we accept the signature if it matches ANY plausible
   * combination of:
   *   - signature header:  ycloud-signature | webhook-signature | svix-signature
   *   - signature value:   "t=..,s=.." | "v1,<sig> .." | raw
   *   - timestamp source:  the header's `t=` | webhook-timestamp | svix-timestamp
   *   - message id source: webhook-id | svix-id (may be absent)
   *   - signed payload:    "{ts}.{body}" | "{id}.{ts}.{body}" | "{body}"
   *   - HMAC key:          raw secret | secret w/o whsec_ | base64-decoded
   *   - output encoding:   hex | base64
   * Every candidate still requires knowledge of the secret, so this stays
   * secure while being tolerant of YCloud's exact scheme.
   *
   * Escape hatches (env):
   *   YCLOUD_WEBHOOK_DEBUG=true       -> log header/candidate info (no PII)
   *   YCLOUD_WEBHOOK_SKIP_VERIFY=true -> accept without verifying (LOCAL TEST ONLY)
   *
   * FAIL-CLOSED: if no secret is configured, returns false (reject everything).
   */
  verifySignature(
    rawBody: Buffer | undefined,
    headers: Record<string, string | string[] | undefined>,
  ): boolean {
    const debug = process.env.YCLOUD_WEBHOOK_DEBUG === 'true';
    const skip = process.env.YCLOUD_WEBHOOK_SKIP_VERIFY === 'true';

    const secret = this.webhookSecret;
    if (!secret) {
      if (debug) this.logger.warn('[webhook] No YCLOUD_WEBHOOK_SECRET configured (fail-closed).');
      return false;
    }
    if (!rawBody) return false;

    const h = (name: string): string | undefined => {
      const v = headers[name.toLowerCase()];
      return Array.isArray(v) ? v[0] : v;
    };

    const sigHeader =
      h('ycloud-signature') ||
      h('webhook-signature') ||
      h('svix-signature') ||
      h('x-ycloud-signature');
    const tsHeader = h('webhook-timestamp') || h('svix-timestamp');
    const idHeader = h('webhook-id') || h('svix-id');

    if (debug) {
      this.logger.warn(`[webhook] header names: ${Object.keys(headers).join(', ')}`);
      this.logger.warn(`[webhook] sig=${sigHeader ?? '(none)'} ts=${tsHeader ?? '(none)'} id=${idHeader ?? '(none)'}`);
    }

    if (skip) {
      this.logger.warn('[webhook] SIGNATURE CHECK SKIPPED via YCLOUD_WEBHOOK_SKIP_VERIFY — insecure, local testing only.');
      return true;
    }

    if (!sigHeader) return false;

    // --- Extract timestamp and provided signature(s) ---
    let timestamp = tsHeader;
    const providedSigs: string[] = [];

    for (const part of sigHeader.split(/[,\s]+/).map((p) => p.trim()).filter(Boolean)) {
      // Only "t=" and "s=" are treated as key=value. Everything else is taken
      // as a raw signature. This is important because base64 signatures can
      // contain "=" padding, which must NOT be parsed as a key=value separator.
      if (part.startsWith('t=')) {
        timestamp = timestamp || part.slice(2);
      } else if (part.startsWith('s=')) {
        providedSigs.push(part.slice(2));
      } else if (/^v\d+$/i.test(part)) {
        // "v1" version token in "v1,<sig>" style -> skip the token itself.
        continue;
      } else {
        providedSigs.push(part);
      }
    }
    if (providedSigs.length === 0) providedSigs.push(sigHeader.trim());

    // --- Candidate signed payloads ---
    const bodyStr = rawBody.toString('utf8');
    const payloads: string[] = [];
    if (timestamp && idHeader) payloads.push(`${idHeader}.${timestamp}.${bodyStr}`);
    if (timestamp) payloads.push(`${timestamp}.${bodyStr}`);
    payloads.push(bodyStr);

    // --- Candidate HMAC keys ---
    const secretNoPrefix = secret.replace(/^whsec_/, '');
    const keys: Buffer[] = [Buffer.from(secret, 'utf8'), Buffer.from(secretNoPrefix, 'utf8')];
    try {
      const decoded = Buffer.from(secretNoPrefix, 'base64');
      if (decoded.length > 0) keys.push(decoded);
    } catch {
      /* ignore invalid base64 */
    }

    const providedBuffers = providedSigs.map((s) => Buffer.from(s, 'utf8'));

    for (const payload of payloads) {
      for (const key of keys) {
        const digest = createHmac('sha256', key).update(payload, 'utf8').digest();
        for (const encoded of [digest.toString('hex'), digest.toString('base64')]) {
          const expected = Buffer.from(encoded, 'utf8');
          for (const provided of providedBuffers) {
            if (expected.length === provided.length && timingSafeEqual(expected, provided)) {
              return true;
            }
          }
        }
      }
    }

    if (debug) {
      this.logger.warn(`[webhook] no signature match. tried ${payloads.length} payloads x ${keys.length} keys x 2 encodings vs ${providedSigs.length} provided sig(s).`);
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
