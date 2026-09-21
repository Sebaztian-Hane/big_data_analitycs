import { useState } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function MyAiIntegrationPanel({ projectId }: { projectId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (import.meta.env.VITE_MY_AI_INTEGRATION_UI !== 'true') return null

  const register = async () => {
    setBusy(true)
    setMessage('')
    try {
      const { data, error } = await supabase.functions.invoke('my-ai-project-register', { body: { projectId } })
      if (error || data?.registered !== true) throw new Error('No se pudo registrar. Comprueba que la integración esté configurada y habilitada.')
      setMessage('Proyecto registrado en My_AI. Esto no habilita el módulo ni concede accesos; el administrador biométrico debe gestionarlos allí.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar.')
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)] p-5">
    <h3 className="font-semibold text-[var(--text-primary)]">My_AI</h3>
    <p className="my-2 text-sm text-[var(--text-secondary)]">Registrar solo envía el identificador y nombre del proyecto. No transfiere usuarios ni datos biométricos.</p>
    <button type="button" disabled={busy} onClick={() => void register()} className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Registrando…' : 'Registrar proyecto en My_AI'}</button>
    {message && <p role="status" className="mt-3 text-sm text-[var(--text-secondary)]">{message}</p>}
  </section>
}
