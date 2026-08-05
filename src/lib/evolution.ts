// Cliente HTTP pra Evolution API — usado pelas automações de lembrete, que
// mandam direto por aqui (não dependem de já existir conversa no Chatwoot).
export type EvolutionConfig = {
  baseUrl: string
  apiKey: string
  instanceName: string
}

// Normaliza telefone BR pro formato que a Evolution espera (DDI+DDD+número,
// só dígitos). Assume Brasil (55) quando não vem DDI.
export function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('55') && digits.length >= 12) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export async function sendWhatsAppText(
  config: EvolutionConfig,
  phone: string,
  text: string
): Promise<void> {
  const number = normalizePhone(phone)
  if (!number) throw new Error('Telefone inválido.')

  const res = await fetch(`${config.baseUrl}/message/sendText/${config.instanceName}`, {
    method: 'POST',
    headers: {
      apikey: config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ number, text }),
  })

  if (!res.ok) {
    throw new Error(`Evolution API ${res.status}: ${await res.text()}`)
  }
}
