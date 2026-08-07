'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { MessageCircle, Send, User } from 'lucide-react'
import { listConversationsAction, listMessagesAction, sendMessageAction } from '@/app/actions/chat'
import type { ChatwootConversation, ChatwootMessage } from '@/lib/chatwoot'

const CONVERSATIONS_POLL_MS = 8000
const MESSAGES_POLL_MS = 3000

function timeShort(unixSeconds: number) {
  return new Date(unixSeconds * 1000).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ChatApp({ initial }: { initial: ChatwootConversation[] }) {
  const [conversations, setConversations] = useState(initial)
  const [selectedId, setSelectedId] = useState<number | null>(initial[0]?.id ?? null)
  const [messages, setMessages] = useState<ChatwootMessage[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSending, startSending] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  const selected = conversations.find((c) => c.id === selectedId) ?? null

  useEffect(() => {
    async function loadConversations() {
      const result = await listConversationsAction()
      if (result && 'conversations' in result) {
        setConversations(result.conversations ?? [])
      }
    }

    const interval = setInterval(loadConversations, CONVERSATIONS_POLL_MS)

    // Aba em segundo plano (ex: usuário foi mandar mensagem de teste no
    // WhatsApp) faz o browser jogar o setInterval pra bem mais devagar
    // (throttling padrão de aba inativa) — sem isso, dava impressão de que
    // a mensagem só chegava depois de recarregar a página manualmente.
    function onVisible() {
      if (document.visibilityState === 'visible') loadConversations()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return

    let cancelled = false

    async function load() {
      const result = await listMessagesAction(selectedId!)
      if (!cancelled && result && 'messages' in result) {
        setMessages(result.messages ?? [])
      }
    }

    load()
    const interval = setInterval(load, MESSAGES_POLL_MS)

    function onVisible() {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedId || !draft.trim()) return
    setError(null)
    const content = draft.trim()
    setDraft('')
    startSending(async () => {
      const result = await sendMessageAction(selectedId, content)
      if (result && 'error' in result) {
        setError(result.error ?? null)
        setDraft(content)
      } else if (result && 'message' in result) {
        setMessages((prev) => [...prev, result.message])
      }
    })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex w-72 shrink-0 flex-col divide-y divide-border overflow-y-auto border-r border-border">
        {conversations.length ? (
          conversations.map((c) => {
            const sender = c.meta.sender
            const lastMessage = c.messages[c.messages.length - 1]
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`flex items-start gap-2.5 px-3 py-3 text-left ${
                  selectedId === c.id ? 'bg-accent-soft' : 'hover:bg-bg'
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-soft text-xs font-semibold text-accent">
                  {sender.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sender.thumbnail} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-medium text-text">{sender.name}</p>
                    {c.unread_count > 0 && (
                      <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-white">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-text-secondary">
                    {lastMessage?.content ?? '—'}
                  </p>
                </div>
              </button>
            )
          })
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-text-secondary">
            <MessageCircle className="h-6 w-6 opacity-40" />
            <p className="text-sm">Nenhuma conversa.</p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        {selected ? (
          <>
            <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-text">{selected.meta.sender.name}</p>
                <p className="text-xs text-text-secondary">{selected.meta.sender.phone_number}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-bg p-4">
              <div className="flex flex-col gap-2">
                {messages.map((m) => {
                  if (m.message_type === 2) {
                    return (
                      <p key={m.id} className="text-center text-xs text-text-secondary">
                        {m.content}
                      </p>
                    )
                  }
                  const outgoing = m.message_type === 1 || m.message_type === 3
                  return (
                    <div key={m.id} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
                          outgoing
                            ? 'rounded-br-sm bg-brand text-white'
                            : 'rounded-bl-sm border border-border bg-surface text-text'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p
                          className={`mt-1 text-right text-[10px] ${
                            outgoing ? 'text-white/70' : 'text-text-secondary'
                          }`}
                        >
                          {timeShort(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            <form onSubmit={handleSend} className="flex gap-2 border-t border-border p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Digite uma mensagem..."
                className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                className="flex items-center justify-center rounded-lg bg-accent px-4 text-white disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            {error && <p className="px-3 pb-2 text-xs text-status-cancelled">{error}</p>}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-secondary">
            <MessageCircle className="h-8 w-8 opacity-40" />
            <p>Selecione uma conversa.</p>
          </div>
        )}
      </div>
    </div>
  )
}
