import { describe, it, expect } from 'vitest'
import { buildPrompt, humanizeReply } from './ai-reply'

describe('buildPrompt', () => {
  it('inclui o texto do roteiro e a mensagem do paciente', () => {
    const prompt = buildPrompt('Olá! Bem-vindo(a) à Clínica X.', 'oi, quero marcar')
    expect(prompt).toContain('Olá! Bem-vindo(a) à Clínica X.')
    expect(prompt).toContain('oi, quero marcar')
    expect(prompt).toContain('NÃO adicione, remova ou altere fatos')
  })
})

describe('humanizeReply', () => {
  it('retorna o texto gerado quando a IA responde a tempo', async () => {
    const generate = async () => '  Oi! Bem-vindo à Clínica X, que bom te ver por aqui!  '
    const result = await humanizeReply('Olá! Bem-vindo(a) à Clínica X.', 'oi', generate)
    expect(result).toBe('Oi! Bem-vindo à Clínica X, que bom te ver por aqui!')
  })

  it('cai pro texto original quando a IA lança erro', async () => {
    const generate = async () => { throw new Error('rate limit') }
    const result = await humanizeReply('Olá! Bem-vindo(a) à Clínica X.', 'oi', generate)
    expect(result).toBe('Olá! Bem-vindo(a) à Clínica X.')
  })

  it('cai pro texto original quando a IA estoura o timeout', async () => {
    const generate = () => new Promise<string>((resolve) => setTimeout(() => resolve('tarde demais'), 50))
    const result = await humanizeReply('Olá! Bem-vindo(a) à Clínica X.', 'oi', generate, 10)
    expect(result).toBe('Olá! Bem-vindo(a) à Clínica X.')
  })

  it('cai pro texto original quando a IA retorna string vazia', async () => {
    const generate = async () => '   '
    const result = await humanizeReply('Olá! Bem-vindo(a) à Clínica X.', 'oi', generate)
    expect(result).toBe('Olá! Bem-vindo(a) à Clínica X.')
  })
})
