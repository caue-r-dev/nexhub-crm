'use server'

import { getCurrentTenant } from '@/lib/tenant'
import { getChatwootConfig, listConversations, listMessages, sendMessage } from '@/lib/chatwoot'

export async function listConversationsAction() {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const config = getChatwootConfig(tenant)
  if (!config) return { error: 'Atendimento via WhatsApp não configurado pra esse tenant.' }

  try {
    const conversations = await listConversations(config)
    return { conversations }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao buscar conversas.' }
  }
}

export async function listMessagesAction(conversationId: number) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const config = getChatwootConfig(tenant)
  if (!config) return { error: 'Atendimento via WhatsApp não configurado pra esse tenant.' }

  try {
    const messages = await listMessages(config, conversationId)
    return { messages }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao buscar mensagens.' }
  }
}

export async function sendMessageAction(conversationId: number, content: string) {
  if (!content.trim()) return { error: 'Mensagem vazia.' }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const config = getChatwootConfig(tenant)
  if (!config) return { error: 'Atendimento via WhatsApp não configurado pra esse tenant.' }

  try {
    const message = await sendMessage(config, conversationId, content.trim())
    return { message }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao enviar mensagem.' }
  }
}
