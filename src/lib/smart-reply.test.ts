import { describe, it, expect } from 'vitest'
import { buildClassifyPrompt, classifyMessage } from './smart-reply'

const knownFacts = 'Nome: Clínica Teste\nEndereço: Rua X, 123\nConvênios aceitos: Unimed, Bradesco Saúde'
const pendingQuestion = 'Qual o seu nome?'

describe('buildClassifyPrompt', () => {
  it('inclui pergunta pendente, mensagem do paciente e dados conhecidos', () => {
    const prompt = buildClassifyPrompt(pendingQuestion, 'oi tudo bem', knownFacts)
    expect(prompt).toContain(pendingQuestion)
    expect(prompt).toContain('oi tudo bem')
    expect(prompt).toContain('Unimed')
  })
})

describe('classifyMessage', () => {
  it('reconhece RESPONDE_ESTAGIO quando a IA classifica como resposta normal', async () => {
    const generate = async () => 'RESPONDE_ESTAGIO'
    const result = await classifyMessage(pendingQuestion, 'João', knownFacts, generate)
    expect(result).toEqual({ kind: 'responde_estagio' })
  })

  it('reconhece RESPONDE_PERGUNTA e devolve a resposta quando os fatos batem', async () => {
    const generate = async () => 'RESPONDE_PERGUNTA\nSim, aceitamos Unimed e Bradesco Saúde.'
    const result = await classifyMessage('Podemos agendar?', 'vcs tem convenio unimed?', knownFacts, generate)
    expect(result).toEqual({ kind: 'responde_pergunta', answer: 'Sim, aceitamos Unimed e Bradesco Saúde.' })
  })

  it('escala quando a resposta gerada cita valor que não está nos dados conhecidos', async () => {
    const generate = async () => 'RESPONDE_PERGUNTA\nA consulta custa R$ 1,00.'
    const result = await classifyMessage('Podemos agendar?', 'quanto custa?', knownFacts, generate)
    expect(result).toEqual({ kind: 'escalar' })
  })

  it('escala quando a resposta gerada cita link que não está nos dados conhecidos', async () => {
    const generate = async () => 'RESPONDE_PERGUNTA\nAcesse https://site-fora-do-conhecido.com'
    const result = await classifyMessage('Podemos agendar?', 'qual o site?', knownFacts, generate)
    expect(result).toEqual({ kind: 'escalar' })
  })

  it('reconhece ESCALAR direto', async () => {
    const generate = async () => 'ESCALAR'
    const result = await classifyMessage(pendingQuestion, 'pergunta bem esquisita', knownFacts, generate)
    expect(result).toEqual({ kind: 'escalar' })
  })

  it('cai pro fluxo padrão (responde_estagio) quando a IA falha/estoura timeout', async () => {
    const generate = () => new Promise<string>((resolve) => setTimeout(() => resolve('RESPONDE_ESTAGIO'), 50))
    const result = await classifyMessage(pendingQuestion, 'oi', knownFacts, generate, 10)
    expect(result).toEqual({ kind: 'responde_estagio' })
  })

  it('cai pro fluxo padrão quando a IA lança erro', async () => {
    const generate = async () => {
      throw new Error('rate limit')
    }
    const result = await classifyMessage(pendingQuestion, 'oi', knownFacts, generate)
    expect(result).toEqual({ kind: 'responde_estagio' })
  })

  it('cai pro fluxo padrão quando a resposta vem em formato inesperado', async () => {
    const generate = async () => 'texto aleatório que não bate com nenhum formato'
    const result = await classifyMessage(pendingQuestion, 'oi', knownFacts, generate)
    expect(result).toEqual({ kind: 'responde_estagio' })
  })

  it('escala quando RESPONDE_PERGUNTA vem sem nenhum texto de resposta', async () => {
    const generate = async () => 'RESPONDE_PERGUNTA\n   '
    const result = await classifyMessage(pendingQuestion, 'oi', knownFacts, generate)
    expect(result).toEqual({ kind: 'escalar' })
  })
})
