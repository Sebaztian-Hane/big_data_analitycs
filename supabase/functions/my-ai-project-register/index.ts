import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/http.ts'
import { signProjectSync } from '../_shared/project-sync.ts'
import { readLimitedBody } from '../_shared/limited-body.ts'

export async function handle(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  if (Deno.env.get('MY_AI_INTEGRATION_ENABLED') !== 'true') return json({ error: 'Integración desactivada.' }, 503)
  const secret = Deno.env.get('ERP_BRIDGE_SECRET') ?? ''
  const issuer = Deno.env.get('ERP_BRIDGE_ISSUER') ?? ''
  const audience = Deno.env.get('ERP_BRIDGE_AUDIENCE') ?? ''
  const destination = Deno.env.get('MY_AI_REGISTER_URL') ?? ''
  if (secret.length < 32 || !issuer || !audience) return json({ error: 'Integración sin configurar.' }, 503)
  try {
    const target = new URL(destination)
    if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash) throw new Error()
  } catch { return json({ error: 'Destino no configurado.' }, 503) }
  try {
    const caller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('authorization') ?? '' } }, auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user }, error: authError } = await caller.auth.getUser()
    if (authError || !user) return json({ error: 'No autenticado.' }, 401)
    const { data: profile, error: profileError } = await caller.from('profiles').select('role,must_change_password').eq('id', user.id).single()
    if (profileError || profile?.role !== 'admin' || profile.must_change_password !== false) return json({ error: 'Acceso denegado.' }, 403)
    let projectId: string
    try {
      const body = JSON.parse(await readLimitedBody(request))
      if (!body || Object.keys(body).join(',') !== 'projectId' || typeof body.projectId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.projectId)) throw new Error()
      projectId = body.projectId
    } catch { return json({ error: 'Proyecto inválido.' }, 400) }
    const { data: project, error } = await caller.from('projects').select('id,name').eq('id', projectId).single()
    if (error || !project) return json({ error: 'Proyecto no disponible.' }, 404)
    const now = Math.floor(Date.now() / 1000)
    const signed = await signProjectSync({ version: 1, purpose: 'project-metadata', issuer, audience, nonce: crypto.randomUUID(), issuedAt: now, expiresAt: now + 120, project: { id: project.id, name: project.name.trim() } }, secret)
    const response = await fetch(destination, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json', 'x-bridge-signature': signed.signature }, body: signed.body, signal: AbortSignal.timeout(10000) })
    if (!response.ok) { await response.body?.cancel(); return json({ error: 'My_AI no pudo registrar el proyecto.' }, 502) }
    await response.body?.cancel()
    return json({ registered: true, message: 'Proyecto registrado. La habilitación y los permisos se gestionan por separado en My_AI.' })
  } catch { return json({ error: 'No se pudo registrar el proyecto.' }, 502) }
}
if (import.meta.main) Deno.serve(handle)
