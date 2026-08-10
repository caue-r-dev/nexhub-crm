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

// Busca a URL da foto de perfil do WhatsApp do contato (Baileys expõe isso
// via /chat/fetchProfilePictureUrl). Retorna null se o contato não tiver
// foto pública ou não existir no WhatsApp — nunca lança erro, quem chama
// decide se quer fallback.
export async function fetchWhatsAppProfilePictureUrl(config: EvolutionConfig, phone: string): Promise<string | null> {
  const number = normalizePhone(phone)
  if (!number) return null

  try {
    const res = await fetch(`${config.baseUrl}/chat/fetchProfilePictureUrl/${config.instanceName}`, {
      method: 'POST',
      headers: {
        apikey: config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ number }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { profilePictureUrl?: string }
    return data.profilePictureUrl ?? null
  } catch {
    return null
  }
}

// QR code do Pix é sempre um data URL (`data:image/png;base64,...`, gerado
// por `generatePixQr`) — a Evolution espera só o base64 puro no campo
// `media`, sem o prefixo.
export async function sendWhatsAppImage(
  config: EvolutionConfig,
  phone: string,
  imageDataUrl: string,
  caption?: string
): Promise<void> {
  const number = normalizePhone(phone)
  if (!number) throw new Error('Telefone inválido.')

  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '')

  const res = await fetch(`${config.baseUrl}/message/sendMedia/${config.instanceName}`, {
    method: 'POST',
    headers: {
      apikey: config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number,
      mediatype: 'image',
      mimetype: 'image/png',
      media: base64,
      fileName: 'pix-qrcode.png',
      caption,
    }),
  })

  if (!res.ok) {
    throw new Error(`Evolution API ${res.status}: ${await res.text()}`)
  }
}
