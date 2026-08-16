import { describe, it, expect } from 'vitest'
import { isSessionExpired, isOutgoingMessageFresh, isClosedToday } from './bot-engine'
import type { BusinessHours } from './supabase/types'

const activeDay = { start: '09:00', end: '18:00', active: true }
const inactiveDay = { start: '09:00', end: '18:00', active: false }

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

describe('isClosedToday', () => {
  // 2023-01-01 é domingo, 2023-01-02 é segunda — datas âncora conhecidas,
  // sem depender da data "hoje" do sistema.
  const sunday = new Date(2023, 0, 1)
  const monday = new Date(2023, 0, 2)

  it('retorna false quando business_hours é null (sem horário configurado)', () => {
    expect(isClosedToday(null, sunday)).toBe(false)
  })

  it('retorna true no domingo quando domingo está desativado', () => {
    const hours: BusinessHours = {
      monday: activeDay,
      tuesday: activeDay,
      wednesday: activeDay,
      thursday: activeDay,
      friday: activeDay,
      saturday: inactiveDay,
      sunday: inactiveDay,
    }
    expect(isClosedToday(hours, sunday)).toBe(true)
  })

  it('retorna false na segunda quando segunda está ativa', () => {
    const hours: BusinessHours = {
      monday: activeDay,
      tuesday: activeDay,
      wednesday: activeDay,
      thursday: activeDay,
      friday: activeDay,
      saturday: inactiveDay,
      sunday: inactiveDay,
    }
    expect(isClosedToday(hours, monday)).toBe(false)
  })
})
