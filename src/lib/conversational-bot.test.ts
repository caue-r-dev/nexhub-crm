import { describe, it, expect } from 'vitest'
import { buildTurnPrompt, decideBotTurn, HANDOFF_FALLBACK_MESSAGE } from './conversational-bot'

const roteiro = '1. Pergunte o nome. 2. Pergunte a necessidade. 3. Explique o processo. 4. Passe valor/horário/link.'
const knownFacts = 'Nome da clínica: Clínica Teste\nValor da consulta: R$ 150,00\nLink de agendamento: https://nexhub.nexvix.com.br/agendar/teste'

describe('buildTurnPrompt', () => {
  it('inclui roteiro, dados conhecidos, fatos capturados, histórico e mensagem do paciente', () => {
    const prompt = buildTurnPrompt(roteiro, knownFacts, { nome: 'Marcos' }, [{ role: 'bot', text: 'Oi!' }], 'quero marcar')
    expect(prompt).toContain('Pergunte o nome')
    expect(prompt).toContain('R$ 150,00')
    expect(prompt).toContain('nome: Marcos')
    expect(prompt).toContain('Clínica: Oi!')
    expect(prompt).toContain('quero marcar')
  })
})

describe('decideBotTurn', () => {
  it('retorna reply, fatos extraídos, handoff e done quando o JSON é válido e os fatos batem', async () => {
    const generate = async () =>
      JSON.stringify({
        reply: 'Olá Marcos! Nossa consulta custa R$ 150,00. Link: https://nexhub.nexvix.com.br/agendar/teste',
        extracted_facts: { nome: 'Marcos' },
        handoff: false,
        done: true,
      })
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'sou o Marcos, quero marcar', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(result).toEqual({
      reply: 'Olá Marcos! Nossa consulta custa R$ 150,00. Link: https://nexhub.nexvix.com.br/agendar/teste',
      extractedFacts: { nome: 'Marcos' },
      handoff: false,
      done: true,
    })
  })

  it('aceita JSON envolvido em ```json apesar de instruído a não fazer isso', async () => {
    const generate = async () => '```json\n{"reply": "Oi!", "extracted_facts": {}, "handoff": false, "done": false}\n```'
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(result.reply).toBe('Oi!')
  })

  it('escala quando o reply cita valor que não bate com os dados conhecidos', async () => {
    const generate = async () =>
      JSON.stringify({ reply: 'A consulta custa R$ 1,00.', extracted_facts: {}, handoff: false, done: false })
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'quanto custa?', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(result).toEqual({ reply: HANDOFF_FALLBACK_MESSAGE, extractedFacts: {}, handoff: true, done: false })
  })

  it('escala quando o reply cita link que não bate com os dados conhecidos', async () => {
    const generate = async () =>
      JSON.stringify({ reply: 'Acesse https://outro-link.com', extracted_facts: {}, handoff: false, done: false })
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'qual o link?', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(result).toEqual({ reply: HANDOFF_FALLBACK_MESSAGE, extractedFacts: {}, handoff: true, done: false })
  })

  it('cai pro fallback de escalação quando a resposta não é JSON válido', async () => {
    const generate = async () => 'isso não é json'
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(result).toEqual({ reply: HANDOFF_FALLBACK_MESSAGE, extractedFacts: {}, handoff: true, done: false })
  })

  it('cai pro fallback de escalação quando a IA lança erro', async () => {
    const generate = async () => {
      throw new Error('rate limit')
    }
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(result).toEqual({ reply: HANDOFF_FALLBACK_MESSAGE, extractedFacts: {}, handoff: true, done: false })
  })

  it('cai pro fallback de escalação quando estoura o timeout', async () => {
    const generate = () =>
      new Promise<string>((resolve) =>
        setTimeout(() => resolve(JSON.stringify({ reply: 'tarde demais', extracted_facts: {}, handoff: false, done: false })), 50)
      )
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', HANDOFF_FALLBACK_MESSAGE, generate, 10)
    expect(result).toEqual({ reply: HANDOFF_FALLBACK_MESSAGE, extractedFacts: {}, handoff: true, done: false })
  })

  it('usa o fallback fixo quando handoff é true e a IA não deu texto de resposta', async () => {
    const generate = async () => JSON.stringify({ reply: null, extracted_facts: {}, handoff: true, done: false })
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'pergunta muito específica', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(result).toEqual({ reply: HANDOFF_FALLBACK_MESSAGE, extractedFacts: {}, handoff: true, done: false })
  })

  it('usa a mensagem de escalonamento personalizada do tenant, não a padrão', async () => {
    const customMessage = 'Já te chamo, um segundinho!'
    const generate = async () => {
      throw new Error('falha qualquer')
    }
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', customMessage, generate)
    expect(result).toEqual({ reply: customMessage, extractedFacts: {}, handoff: true, done: false })
  })

  it('tenta de novo uma vez quando a IA falha na primeira tentativa, e usa o resultado da segunda', async () => {
    let calls = 0
    const generate = async () => {
      calls++
      if (calls === 1) throw new Error('falha de rede transitória')
      return JSON.stringify({ reply: 'Oi! (segunda tentativa)', extracted_facts: {}, handoff: false, done: false })
    }
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(calls).toBe(2)
    expect(result.reply).toBe('Oi! (segunda tentativa)')
    expect(result.handoff).toBe(false)
  })

  it('cai pro fallback só depois de falhar nas duas tentativas (não em loop infinito)', async () => {
    let calls = 0
    const generate = async () => {
      calls++
      throw new Error('fora do ar')
    }
    const result = await decideBotTurn(roteiro, knownFacts, {}, [], 'oi', HANDOFF_FALLBACK_MESSAGE, generate)
    expect(calls).toBe(2)
    expect(result).toEqual({ reply: HANDOFF_FALLBACK_MESSAGE, extractedFacts: {}, handoff: true, done: false })
  })
})
