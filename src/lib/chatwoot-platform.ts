// Cliente da Platform API do Chatwoot — só usado pelo onboarding automático
// de WhatsApp (painel admin). Diferente de src/lib/chatwoot.ts (API normal,
// escopada por Account/tenant): aqui é o nível de instalação, usado só pra
// criar Account/User novos. Token de super-admin (CHATWOOT_PLATFORM_TOKEN),
// nunca deve chegar no client nem ser salvo em tabela de tenant.
const BASE_URL = process.env.CHATWOOT_BASE_URL
const PLATFORM_TOKEN = process.env.CHATWOOT_PLATFORM_TOKEN

async function platformFetch(path: string, init?: RequestInit) {
  if (!BASE_URL || !PLATFORM_TOKEN) {
    throw new Error('CHATWOOT_BASE_URL / CHATWOOT_PLATFORM_TOKEN não configurados.')
  }

  const res = await fetch(`${BASE_URL}/platform/api/v1${path}`, {
    ...init,
    headers: {
      api_access_token: PLATFORM_TOKEN,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Chatwoot Platform API ${res.status}: ${await res.text()}`)
  }

  return res.json()
}

export async function createPlatformAccount(name: string): Promise<{ id: number; name: string }> {
  return platformFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function createPlatformUser(input: {
  name: string
  email: string
  password: string
}): Promise<{ id: number; access_token: string }> {
  return platformFetch('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function linkAccountUser(accountId: number, userId: number, role: 'administrator' | 'agent' = 'administrator') {
  return platformFetch(`/accounts/${accountId}/account_users`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, role }),
  })
}

// Application API (escopada por Account, usa o token do usuário recém-criado)
// — só pra buscar o inbox que o Evolution API criou via autoCreate, já que a
// resposta de /instance/create não devolve o inbox_id do Chatwoot.
export async function findInboxByName(
  accountId: number,
  userToken: string,
  inboxName: string
): Promise<number | null> {
  const res = await fetch(`${BASE_URL}/api/v1/accounts/${accountId}/inboxes`, {
    headers: { api_access_token: userToken },
    cache: 'no-store',
  })
  if (!res.ok) return null
  const data = await res.json()
  const inbox = (data.payload as { id: number; name: string }[]).find((i) => i.name === inboxName)
  return inbox?.id ?? null
}
