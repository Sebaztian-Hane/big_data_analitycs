import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { sendEmail } from '../_shared/email.ts'
import { escapeHtml } from '../_shared/html.ts'
import { corsHeaders, json } from '../_shared/http.ts'
import { signInvitationEnvelope } from '../_shared/invitation-envelope.ts'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const inviteToken = /^[A-Za-z0-9_-]{43}$/

function configuredUrl(name: string, allowSearch = false) {
  const value = Deno.env.get(name) ?? ''
  const parsed = new URL(value)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash || (!allowSearch && parsed.search)) throw new Error(`Invalid ${name}`)
  return parsed
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Método no permitido.' }, 405)
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const caller = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } }, auth: { persistSession: false, autoRefreshToken: false } })
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return json({ error: 'No autenticado.' }, 401)
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: actor } = await admin.from('profiles').select('role,must_change_password').eq('id', user.id).single()
    if (actor?.role !== 'admin' || actor.must_change_password !== false) return json({ error: 'Acceso denegado.' }, 403)

    const bodyText = await request.text()
    if (!bodyText || new TextEncoder().encode(bodyText).length > 2048) return json({ error: 'Datos inválidos.' }, 400)
    const body = JSON.parse(bodyText)
    const projectId = String(body?.projectId ?? '')
    const userId = String(body?.userId ?? '')
    const action = body?.action === 'resend' ? 'resend' : 'add'
    if (!uuid.test(projectId) || !uuid.test(userId)) return json({ error: 'Datos inválidos.' }, 400)
    const [{ data: project }, { data: target }] = await Promise.all([
      admin.from('projects').select('id,name').eq('id', projectId).single(),
      admin.from('profiles').select('id,email,full_name,role').eq('id', userId).single(),
    ])
    if (!project || !target?.email || target.role === 'admin') return json({ error: 'Proyecto o usuario no disponible.' }, 404)

    const { data: existing } = await admin.from('project_members').select('user_id').eq('project_id', projectId).eq('user_id', userId).maybeSingle()
    let memberAdded = false
    if (action === 'add') {
      if (existing) return json({ error: 'El usuario ya pertenece al proyecto.' }, 409)
      const { error } = await admin.from('project_members').insert({ project_id: projectId, user_id: userId, added_by: user.id })
      if (error) throw error
      memberAdded = true
    } else if (!existing) return json({ error: 'El usuario no pertenece al proyecto.' }, 409)

    if (Deno.env.get('MY_AI_INVITATIONS_ENABLED') !== 'true')
      return json({ memberAdded, notificationSent: false, message: 'Miembro agregado, pero las invitaciones de My_AI están desactivadas.' })

    try {
      const secret = Deno.env.get('ERP_INVITATION_SECRET') ?? ''
      const issuer = Deno.env.get('ERP_INVITATION_ISSUER') ?? ''
      const audience = Deno.env.get('ERP_INVITATION_AUDIENCE') ?? ''
      if (secret.length < 32 || !issuer || !audience) throw new Error('Integration not configured')
      const endpoint = configuredUrl('MY_AI_INVITATION_ENDPOINT')
      const appUrl = configuredUrl('MY_AI_APP_URL', true)
      const now = Math.floor(Date.now() / 1000)
      const profileName = (target.full_name || '').trim()
      const signed = await signInvitationEnvelope({
        version: 1,
        purpose: 'face-invitation',
        issuer,
        audience,
        nonce: crypto.randomUUID(),
        issuedAt: now,
        expiresAt: now + 120,
        user: { email: target.email.trim().toLowerCase(), displayName: (profileName.length >= 2 ? profileName : target.email).slice(0, 80) },
        project: { id: project.id, name: project.name.trim() },
      }, secret)
      const receiver = await fetch(endpoint, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json', 'x-invitation-signature': signed.signature }, body: signed.body, signal: AbortSignal.timeout(10000) })
      if (!receiver.ok) { await receiver.body?.cancel(); throw new Error('Invitation receiver failed') }
      const result = await receiver.json() as { registered?: boolean; token?: string }
      const registered = result.registered === true
      if (!registered && (!result.token || !inviteToken.test(result.token))) throw new Error('Invalid invitation response')
      appUrl.search = registered ? '' : `?invite=${encodeURIComponent(result.token!)}`
      const linkLabel = registered ? 'Ingresar a My_AI' : 'Registrarse'
      const expiryText = registered ? '' : '<p>La invitación es personal, de un solo uso y vence en 30 minutos.</p>'
      await sendEmail(target.email, `Acceso a My_AI para ${project.name}`, `<p>Hola ${escapeHtml(target.full_name || target.email)},</p><p>Fuiste agregado al proyecto <strong>${escapeHtml(project.name)}</strong> en Kargia.</p><p>${registered ? 'Tu cuenta de My_AI ya está registrada.' : 'Completa tu registro facial como usuario de consulta.'}</p>${expiryText}<p><a href="${escapeHtml(appUrl.toString())}">${linkLabel}</a></p>`)
      return json({ memberAdded, notificationSent: true, registered, message: registered ? 'Miembro agregado y acceso enviado.' : 'Miembro agregado e invitación enviada por correo.' })
    } catch {
      return json({ memberAdded, notificationSent: false, message: memberAdded ? 'Miembro agregado, pero no se pudo enviar la invitación. Puedes reenviarla.' : 'No se pudo reenviar el acceso a My_AI.' })
    }
  } catch {
    return json({ error: 'No se pudo agregar al usuario.' }, 500)
  }
})
