export interface InvitationEnvelope {
  version: 1
  purpose: 'face-invitation'
  issuer: string
  audience: string
  nonce: string
  issuedAt: number
  expiresAt: number
  user: { email: string; displayName: string }
  project: { id: string; name: string }
}

const encoder = new TextEncoder()

async function key(secret: string) {
  if (encoder.encode(secret).length < 32) throw new Error('Invalid invitation secret')
  return await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
}

export async function signInvitationEnvelope(message: InvitationEnvelope, secret: string) {
  const body = JSON.stringify(message)
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(body))
  return { body, signature: Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, '0')).join('') }
}
