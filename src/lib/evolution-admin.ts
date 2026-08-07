// Cliente admin da Evolution API — só usado pelo onboarding automático de
// WhatsApp (painel admin), pra criar instância nova. Usa a apikey global do
// servidor (EVOLUTION_API_KEY), que funciona pra qualquer instância nesse
// deploy — diferente de src/lib/evolution.ts (mandar mensagem numa instância
// já existente, com a apikey salva por tenant, mas que na prática é a mesma
// chave global).
const BASE_URL = process.env.EVOLUTION_BASE_URL
const ADMIN_API_KEY = process.env.EVOLUTION_API_KEY

function requireEnv() {
  if (!BASE_URL || !ADMIN_API_KEY) {
    throw new Error('EVOLUTION_BASE_URL / EVOLUTION_API_KEY não configurados.')
  }
  return { BASE_URL, ADMIN_API_KEY }
}

export type CreateInstanceInput = {
  instanceName: string
  chatwootAccountId: number
  chatwootToken: string
  chatwootUrl: string
  chatwootNameInbox: string
}

export type QrCode = { base64: string | null; code: string | null }

export async function createInstanceWithChatwoot(input: CreateInstanceInput): Promise<QrCode> {
  const { BASE_URL, ADMIN_API_KEY } = requireEnv()

  const res = await fetch(`${BASE_URL}/instance/create`, {
    method: 'POST',
    headers: { apikey: ADMIN_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instanceName: input.instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      chatwootAccountId: String(input.chatwootAccountId),
      chatwootToken: input.chatwootToken,
      chatwootUrl: input.chatwootUrl,
      chatwootSignMsg: true,
      chatwootReopenConversation: true,
      chatwootConversationPending: false,
      chatwootImportContacts: true,
      chatwootNameInbox: input.chatwootNameInbox,
      chatwootMergeBrazilContacts: true,
      chatwootImportMessages: true,
      chatwootDaysLimitImportMessages: 9999,
      chatwootOrganization: 'NexHub',
    }),
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Evolution API ${res.status}: ${await res.text()}`)
  }

  // `/instance/create` ignora silenciosamente `chatwootAutoCreate` — esse
  // campo só existe em `/chatwoot/set/{instance}` (nomes sem prefixo
  // "chatwoot"). Sem essa segunda chamada o inbox nunca é criado no
  // Chatwoot mesmo com a integração "enabled". Confirmado testando direto
  // na API: 0 inboxes até reenviar a config por aqui.
  const setRes = await fetch(`${BASE_URL}/chatwoot/set/${input.instanceName}`, {
    method: 'POST',
    headers: { apikey: ADMIN_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: true,
      accountId: String(input.chatwootAccountId),
      token: input.chatwootToken,
      url: input.chatwootUrl,
      signMsg: true,
      reopenConversation: true,
      conversationPending: false,
      nameInbox: input.chatwootNameInbox,
      mergeBrazilContacts: true,
      importContacts: true,
      importMessages: true,
      daysLimitImportMessages: 9999,
      autoCreate: true,
      organization: 'NexHub',
    }),
    cache: 'no-store',
  })

  if (!setRes.ok) {
    throw new Error(`Evolution API (chatwoot/set) ${setRes.status}: ${await setRes.text()}`)
  }

  const data = await res.json()
  return { base64: data.qrcode?.base64 ?? null, code: data.qrcode?.code ?? null }
}

// Fallback/refresh — usado pelo polling de status quando o QR do create já
// expirou (Evolution regenera QR novo a cada chamada dessa rota).
export async function getInstanceQrCode(instanceName: string): Promise<QrCode> {
  const { BASE_URL, ADMIN_API_KEY } = requireEnv()

  const res = await fetch(`${BASE_URL}/instance/connect/${instanceName}`, {
    headers: { apikey: ADMIN_API_KEY },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Evolution API ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  return { base64: data.base64 ?? null, code: data.code ?? null }
}

export type ConnectionState = 'open' | 'connecting' | 'close'

export async function getConnectionState(instanceName: string): Promise<ConnectionState> {
  const { BASE_URL, ADMIN_API_KEY } = requireEnv()

  const res = await fetch(`${BASE_URL}/instance/connectionState/${instanceName}`, {
    headers: { apikey: ADMIN_API_KEY },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Evolution API ${res.status}: ${await res.text()}`)
  }

  const data = await res.json()
  return data.instance?.state ?? 'close'
}

// Apaga a instância inteira (sessão Baileys + credenciais) — usado tanto
// pelo botão "Desconectar" quanto pra limpar uma instância travada em
// "connecting" sem nunca ter pareado de verdade.
export async function deleteInstance(instanceName: string): Promise<void> {
  const { BASE_URL, ADMIN_API_KEY } = requireEnv()

  const res = await fetch(`${BASE_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: { apikey: ADMIN_API_KEY },
    cache: 'no-store',
  })

  if (!res.ok && res.status !== 404) {
    throw new Error(`Evolution API ${res.status}: ${await res.text()}`)
  }
}
