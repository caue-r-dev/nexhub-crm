import { describe, it, expect } from 'vitest'
import { isSessionExpired, computeNextStage } from './bot-engine'

describe('isSessionExpired', () => {
  it('retorna false quando updatedAt é null (sessão nunca salva)', () => {
    expect(isSessionExpired(null, new Date('2026-08-11T12:00:00-03:00'))).toBe(false)
  })

  it('retorna false quando dentro da janela de 12h', () => {
    const updatedAt = '2026-08-11T08:00:00-03:00'
    const now = new Date('2026-08-11T12:00:00-03:00')
    expect(isSessionExpired(updatedAt, now)).toBe(false)
  })

  it('retorna true quando passou de 12h', () => {
    const updatedAt = '2026-08-10T08:00:00-03:00'
    const now = new Date('2026-08-11T12:00:00-03:00')
    expect(isSessionExpired(updatedAt, now)).toBe(true)
  })

  it('respeita maxHours customizado', () => {
    const updatedAt = '2026-08-11T10:00:00-03:00'
    const now = new Date('2026-08-11T12:00:00-03:00')
    expect(isSessionExpired(updatedAt, now, 1)).toBe(true)
    expect(isSessionExpired(updatedAt, now, 3)).toBe(false)
  })
})

describe('computeNextStage', () => {
  it('contato novo (current_stage null) começa em primeiro_contato', () => {
    expect(computeNextStage(null)).toBe('primeiro_contato')
  })

  it('avança de primeiro_contato pra pergunta_queixa', () => {
    expect(computeNextStage('primeiro_contato')).toBe('pergunta_queixa')
  })

  it('avança de pergunta_queixa pra explicacao_processo', () => {
    expect(computeNextStage('pergunta_queixa')).toBe('explicacao_processo')
  })

  it('avança de explicacao_processo pro último estágio valor_e_horarios', () => {
    expect(computeNextStage('explicacao_processo')).toBe('valor_e_horarios')
  })

  it('retorna null quando já está no último estágio (não insiste mais)', () => {
    expect(computeNextStage('valor_e_horarios')).toBe(null)
  })

  it('estágio desconhecido/inválido trata como contato novo', () => {
    expect(computeNextStage('estagio-que-nao-existe')).toBe('primeiro_contato')
  })
})
