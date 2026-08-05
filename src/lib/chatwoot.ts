// Cliente HTTP pra API do Chatwoot — só chamado em código server-side
// (server actions). O token de agente nunca é enviado ao browser; o CRM
// constrói sua própria interface, não embute o Chatwoot via iframe.
import type { Database } from '@/lib/supabase/types'

type Tenant = Database['public']['Tables']['tenants']['Row']

export type ChatwootConfig = {
  baseUrl: string
  token: string
  accountId: number
  inboxId: number | null
}

export function getChatwootConfig(tenant: Tenant): ChatwootConfig | null {
  if (!tenant.chatwoot_base_url || !tenant.chatwoot_api_token || !tenant.chatwoot_account_id) {
    return null
  }
  return {
    baseUrl: tenant.chatwoot_base_url,
    token: tenant.chatwoot_api_token,
    accountId: tenant.chatwoot_account_id,
    inboxId: tenant.chatwoot_inbox_id,
  }
}

export type ChatwootSender = {
  id: number
  name: string
  phone_number: string | null
  thumbnail: string | null
}

export type ChatwootMessage = {
  id: number
  content: string | null
  message_type: 0 | 1 | 2 | 3 // 0 incoming, 1 outgoing, 2 activity, 3 template
  created_at: number
  sender?: { name?: string } | null
  attachments?: { data_url: string; file_type: string }[]
}

export type ChatwootConversation = {
  id: number
  inbox_id: number
  status: string
  unread_count: number
  last_activity_at: number
  meta: { sender: ChatwootSender }
  messages: ChatwootMessage[]
}

async function chatwootFetch(config: ChatwootConfig, path: string, init?: RequestInit) {
  const res = await fetch(`${config.baseUrl}/api/v1/accounts/${config.accountId}${path}`, {
    ...init,
    headers: {
      api_access_token: config.token,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Chatwoot API ${res.status}: ${await res.text()}`)
  }

  return res.json()
}

export async function listConversations(config: ChatwootConfig): Promise<ChatwootConversation[]> {
  const qs = config.inboxId ? `&inbox_id=${config.inboxId}` : ''
  const data = await chatwootFetch(config, `/conversations?status=all${qs}`)
  return data.data.payload
}

export async function listMessages(
  config: ChatwootConfig,
  conversationId: number
): Promise<ChatwootMessage[]> {
  const data = await chatwootFetch(config, `/conversations/${conversationId}/messages`)
  return data.payload
}

export async function sendMessage(
  config: ChatwootConfig,
  conversationId: number,
  content: string
): Promise<ChatwootMessage> {
  return chatwootFetch(config, `/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, message_type: 'outgoing' }),
  })
}
