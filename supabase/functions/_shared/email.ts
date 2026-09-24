export async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Deno.env.get('BREVO_API_KEY')
  const senderEmail = Deno.env.get('BREVO_SENDER_EMAIL')
  const senderName = Deno.env.get('BREVO_SENDER_NAME') ?? 'Kargia'
  if (!apiKey || !senderEmail) throw new Error('El servicio de correo no está configurado.')
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ sender: { email: senderEmail, name: senderName }, to: [{ email: to }], subject, htmlContent: html }),
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) { await response.body?.cancel(); throw new Error('No se pudo enviar el correo.') }
  await response.body?.cancel()
}
