import { createSign } from 'crypto'
import { NextResponse } from 'next/server'

// Temporary — DELETE after diagnosis
export async function GET(): Promise<NextResponse> {
  const appId = process.env.GITHUB_APP_ID ?? '(not set)'
  const privateKeyB64 = process.env.GITHUB_APP_PRIVATE_KEY ?? ''

  let keyOk = false
  let jwtHead = ''
  let tokenStatus = 0
  let tokenError = ''

  try {
    const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8')
    keyOk = privateKey.startsWith('-----BEGIN')

    // Build JWT
    function b64url(s: string) {
      return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    }
    const now = Math.floor(Date.now() / 1000)
    const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }))
    const signingInput = `${header}.${payload}`
    const signer = createSign('RSA-SHA256')
    signer.update(signingInput)
    const signature = signer.sign(privateKey, 'base64url')
    const jwt = `${signingInput}.${signature}`
    jwtHead = jwt.slice(0, 30)

    // Try token exchange
    const res = await fetch(`https://api.github.com/app/installations/138897722/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Verdict/0.1',
      },
    })
    tokenStatus = res.status
    if (!res.ok) tokenError = (await res.text()).slice(0, 200)
  } catch (e: unknown) {
    tokenError = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json({
    app_id: appId,
    app_id_len: appId.length,
    app_id_chars: [...appId].map(c => c.charCodeAt(0)),
    key_b64_len: privateKeyB64.length,
    key_starts_with_begin: keyOk,
    jwt_prefix: jwtHead,
    token_exchange_status: tokenStatus,
    token_error: tokenError,
  })
}
