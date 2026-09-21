// Server-only protocol. Never import into browser code or expose the shared secret.
export interface ProjectSync {
  version: 1
  purpose: 'project-metadata'
  issuer: string
  audience: string
  nonce: string
  issuedAt: number
  expiresAt: number
  project: { id: string; name: string }
}
const encoder = new TextEncoder()
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function fail(): never { throw new Error('Invalid integration message') }
async function key(secret: string) {
  if (encoder.encode(secret).length < 32) throw new Error('Integration secret must contain at least 32 bytes')
  return await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}
function validate(value: unknown, issuer: string, audience: string, now: number): ProjectSync {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail()
  const m = value as ProjectSync
  if (Object.keys(m).sort().join(',') !== 'audience,expiresAt,issuedAt,issuer,nonce,project,purpose,version') fail()
  if (m.version !== 1 || m.purpose !== 'project-metadata' || !issuer || !audience || m.issuer !== issuer || m.audience !== audience || typeof m.nonce !== 'string' || !uuid.test(m.nonce)) fail()
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(m.issuedAt) || !Number.isSafeInteger(m.expiresAt) || m.issuedAt > now + 30 || m.expiresAt <= now || m.expiresAt <= m.issuedAt || m.expiresAt - m.issuedAt > 120) fail()
  if (!m.project || typeof m.project !== 'object' || Array.isArray(m.project) || Object.keys(m.project).sort().join(',') !== 'id,name' || typeof m.project.id !== 'string' || !uuid.test(m.project.id) || typeof m.project.name !== 'string' || !m.project.name.trim() || m.project.name.length > 120 || m.project.name !== m.project.name.trim()) fail()
  return m
}
export async function signProjectSync(message: ProjectSync, secret: string, now = Math.floor(Date.now() / 1000)) {
  validate(message, message.issuer, message.audience, now)
  const body = JSON.stringify(message)
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(body))
  return { body, signature: Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('') }
}
