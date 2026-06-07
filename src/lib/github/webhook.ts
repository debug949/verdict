import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Verify a GitHub webhook signature using HMAC-SHA256.
 *
 * GitHub sends: X-Hub-Signature-256: sha256=<hex-digest>
 * We compute the same HMAC over the raw body and compare with timingSafeEqual.
 *
 * Why timingSafeEqual? Regular string comparison (===) short-circuits on the
 * first mismatched character, leaking timing information. An attacker can
 * measure response times to forge signatures one byte at a time.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET
  if (!secret) throw new Error('GITHUB_WEBHOOK_SECRET is not set')

  if (!signature?.startsWith('sha256=')) return false

  const expected =
    'sha256=' +
    createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex')

  // Buffers must be equal length for timingSafeEqual
  if (signature.length !== expected.length) return false

  return timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expected, 'utf8')
  )
}
