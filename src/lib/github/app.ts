import { createSign } from 'crypto'

/**
 * Generate a GitHub App JWT using RS256.
 *
 * GitHub requires:
 *   iat: issued-at, set 60s in the past (clock skew tolerance)
 *   exp: expires in max 10 minutes (we use 9 to stay safely under)
 *   iss: the GitHub App ID as a string
 */
export function generateAppJWT(): string {
  const appId = process.env.GITHUB_APP_ID
  const privateKeyBase64 = process.env.GITHUB_APP_PRIVATE_KEY

  if (!appId || !privateKeyBase64) {
    throw new Error('GITHUB_APP_ID and GITHUB_APP_PRIVATE_KEY must be set')
  }

  const privateKey = Buffer.from(privateKeyBase64, 'base64').toString('utf8')
  const now = Math.floor(Date.now() / 1000)

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId })
  )

  const signingInput = `${header}.${payload}`
  const signer = createSign('RSA-SHA256')
  signer.update(signingInput)
  const signature = signer.sign(privateKey, 'base64url')

  return `${signingInput}.${signature}`
}

/**
 * Exchange a GitHub App JWT for a short-lived installation access token.
 * Tokens expire after 1 hour and are scoped to one installation.
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  const jwt = generateAppJWT()

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Verdict/0.1',
      },
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Installation token exchange failed: ${response.status} ${response.statusText}\n${body}`
    )
  }

  const data = (await response.json()) as { token: string; expires_at: string }
  console.log(`[github-app] token obtained installation=${installationId} expires=${data.expires_at}`)
  return data.token
}

function b64url(input: string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}
