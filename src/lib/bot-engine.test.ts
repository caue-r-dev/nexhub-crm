import { describe, it, expect } from 'vitest'
import { isSessionExpired } from './bot-engine'

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
