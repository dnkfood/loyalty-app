import * as crypto from 'crypto';

/**
 * Verifies an HMAC-SHA256 signature using timing-safe comparison.
 * @param secret - The secret key for HMAC
 * @param rawBody - The raw request body (Buffer or string)
 * @param receivedSignature - The signature from the request header (format: "sha256=<hex>")
 * @returns true if signature is valid
 */
export function verifyHmacSignature(
  secret: string,
  rawBody: Buffer | string,
  receivedSignature: string,
): boolean {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expected = Buffer.from(`sha256=${expectedSig}`);
  const received = Buffer.from(receivedSignature);

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
}

/**
 * Generates an HMAC-SHA256 signature for a payload.
 * @param secret - The secret key for HMAC
 * @param payload - The payload to sign
 * @returns "sha256=<hex>" formatted signature
 */
export function generateHmacSignature(secret: string, payload: string | Buffer): string {
  const sig = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return `sha256=${sig}`;
}
