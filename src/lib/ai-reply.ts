// Reescreve o texto do roteiro de forma natural via Gemini Flash, sem sair
// do conteúdo definido pelo tenant. Qualquer falha (erro, timeout, resposta
// vazia) devolve o texto original do roteiro — o bot nunca trava por causa
// da IA.
import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_TIMEOUT_MS = 5000

export type GenerateFn = (prompt: string) => Promise<string>

export function buildPrompt(scriptText: string, incomingText: string): string {
  return `Reescreva a mensagem abaixo de forma natural, respondendo à última mensagem do paciente. NÃO adicione, remova ou altere fatos (valores, horários, links, nomes). Não responda nada fora desse conteúdo. Devolva só o texto final da mensagem, sem comentários.

Mensagem do paciente: "${incomingText}"

Texto do roteiro: "${scriptText}"`
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err) => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

async function defaultGenerate(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function humanizeReply(
  scriptText: string,
  incomingText: string,
  generate: GenerateFn = defaultGenerate,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<string> {
  try {
    const text = await withTimeout(generate(buildPrompt(scriptText, incomingText)), timeoutMs)
    const trimmed = text?.trim()
    return trimmed || scriptText
  } catch {
    return scriptText
  }
}
