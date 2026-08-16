import { describe, it, expect } from 'vitest'
import { isSessionExpired, isOutgoingMessageFresh } from './bot-engine'

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

describe('isOutgoingMessageFresh', () => {
  const now = 1_700_000_000_000 // ms, valor de referência arbitrário

  it('retorna true quando createdAt não existe', () => {
    expect(isOutgoingMessageFresh(undefined, now)).toBe(true)
    expect(isOutgoingMessageFresh(null, now)).toBe(true)
  })

  it('detecta segundos unix recentes como fresh', () => {
    const createdAtSec = now / 1000 - 30
    expect(isOutgoingMessageFresh(createdAtSec, now)).toBe(true)
  })

  it('detecta segundos unix velhos como não-fresh', () => {
    const createdAtSec = now / 1000 - 200
    expect(isOutgoingMessageFresh(createdAtSec, now)).toBe(false)
  })

  it('detecta milissegundos unix recentes como fresh (por magnitude, não confunde com segundos)', () => {
    const createdAtMs = now - 30_000
    expect(isOutgoingMessageFresh(createdAtMs, now)).toBe(true)
  })

  it('detecta milissegundos unix velhos como não-fresh', () => {
    const createdAtMs = now - 200_000
    expect(isOutgoingMessageFresh(createdAtMs, now)).toBe(false)
  })

  it('parseia string ISO recente como fresh', () => {
    const createdAtIso = new Date(now - 30_000).toISOString()
    expect(isOutgoingMessageFresh(createdAtIso, now)).toBe(true)
  })

  it('parseia string ISO velha como não-fresh', () => {
    const createdAtIso = new Date(now - 200_000).toISOString()
    expect(isOutgoingMessageFresh(createdAtIso, now)).toBe(false)
  })

  it('string inválida cai pro lado seguro (true)', () => {
    expect(isOutgoingMessageFresh('isso não é uma data', now)).toBe(true)
  })

  it('respeita maxAgeSec customizado', () => {
    const createdAtSec = now / 1000 - 50
    expect(isOutgoingMessageFresh(createdAtSec, now, 30)).toBe(false)
    expect(isOutgoingMessageFresh(createdAtSec, now, 60)).toBe(true)
  })
})
