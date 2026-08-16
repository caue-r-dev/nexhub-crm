import { describe, it, expect } from 'vitest'
import { isLockStale } from './contact-lock'

describe('isLockStale', () => {
  it('retorna false pra lock recente (dentro do limite padrão)', () => {
    const lockedAt = '2026-08-16T12:00:00-03:00'
    const now = new Date('2026-08-16T12:00:05-03:00')
    expect(isLockStale(lockedAt, now)).toBe(false)
  })

  it('retorna true pra lock mais velho que o limite padrão (~20s)', () => {
    const lockedAt = '2026-08-16T12:00:00-03:00'
    const now = new Date('2026-08-16T12:00:25-03:00')
    expect(isLockStale(lockedAt, now)).toBe(true)
  })

  it('respeita staleMs customizado', () => {
    const lockedAt = '2026-08-16T12:00:00-03:00'
    const now = new Date('2026-08-16T12:00:03-03:00')
    expect(isLockStale(lockedAt, now, 2_000)).toBe(true)
    expect(isLockStale(lockedAt, now, 5_000)).toBe(false)
  })
})
