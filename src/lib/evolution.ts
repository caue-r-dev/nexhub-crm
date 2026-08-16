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

// Assinatura exata do bug de "socket fantasma": connectionState mente
// 'open' mas o envio real falha com esse erro — só reinicia o container
// inteiro na VPS resolve (confirmado, ver feedback_evolution_ghost_socket_restart).
// Registra o incidente (best-effort, nunca derruba o envio original por
// causa disso) pra um cron detectar e reiniciar sozinho, sem esperar
// ninguém perceber.
const GHOST_SOCKET_PATTERN = /connection closed/i

async function logGhostSocketIncident(instanceName: string, errorMessage: string) {
  if (!GHOST_SOCKET_PATTERN.test(errorMessage)) return
  try {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const admin = createAdminClient()
    await admin.from('evolution_incidents').insert({ instance_name: instanceName, error_message: errorMessage })
  } catch {
    // Log é best-effort — se a própria infra de log estiver com problema,
    // não é isso que deve derrubar o fluxo de mensagens.
  }
}

// 1 retry automático em falha de rede/status 5xx antes de desistir — toda
// falha (mesmo depois do retry) fica logada, nunca engolida em silêncio
// (aconteceu: falha de envio sumia sem log nenhum no catch do webhook do
// Chatwoot). Timeout de 15s no fetch: sem ele, um socket pendurado (ver
// feedback_evolution_ghost_socket_restart) segura essa chamada
// indefinidamente, o que também estoura o orçamento do lock de contato
// (contact-lock.ts).
//
// Falha de rede (fetch rejeitando — ECONNRESET, DNS, socket hang-up, o
// modo de falha mais comum do bug de socket fantasma) sempre retenta,
// porque não dá pra saber se chegou a entregar. Já status HTTP só retenta
// em 5xx: 4xx é determinístico (número inválido, apikey errada) — retry
// não ajuda, só dobra a latência antes de desistir — e um 5xx que chegou
// DEPOIS da mensagem já ter sido entregue de verdade é raro o bastante
// pra aceitar o risco de retry, mas 4xx não tem essa desculpa nenhuma.
async function postToEvolution(config: EvolutionConfig, path: string, body: unknown): Promise<Response> {
  const attempt = () =>
    fetch(`${config.baseUrl}${path}`, {
      method: 'POST',
      headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })

  let res: Response
  try {
    res = await attempt()
  } catch (e) {
    console.error(`[evolution] POST ${path} falhou por erro de rede na 1ª tentativa, tentando de novo:`, e)
    return attempt()
  }

  if (!res.ok && res.status >= 500) {
    console.error(`[evolution] POST ${path} falhou (status ${res.status}) na 1ª tentativa, tentando de novo`)
    res = await attempt()
  }
  return res
}

export async function sendWhatsAppText(config: EvolutionConfig, phone: string, text: string): Promise<void> {
  const number = normalizePhone(phone)
  if (!number) throw new Error('Telefone inválido.')

  const res = await postToEvolution(config, `/message/sendText/${config.instanceName}`, { number, text })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[evolution] envio de texto falhou definitivamente (${config.instanceName}): ${res.status} ${body}`)
    await logGhostSocketIncident(config.instanceName, body)
    throw new Error(`Evolution API ${res.status}: ${body}`)
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

  const res = await postToEvolution(config, `/message/sendMedia/${config.instanceName}`, {
    number,
    mediatype: 'image',
    mimetype: 'image/png',
    media: base64,
    fileName: 'pix-qrcode.png',
    caption,
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`[evolution] envio de imagem falhou definitivamente (${config.instanceName}): ${res.status} ${body}`)
    await logGhostSocketIncident(config.instanceName, body)
    throw new Error(`Evolution API ${res.status}: ${body}`)
  }
}
