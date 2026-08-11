import { describe, it, expect } from 'vitest'
import { phonesMatch } from './existing-client'

describe('phonesMatch', () => {
  it('bate telefones idênticos', () => {
    expect(phonesMatch('+5535997195408', '+5535997195408')).toBe(true)
  })

  it('bate mesmo com formatação diferente (espaços, parênteses, hífen)', () => {
    expect(phonesMatch('+55 (35) 99719-5408', '5535997195408')).toBe(true)
  })

  it('bate mesmo com/sem DDI 55', () => {
    expect(phonesMatch('35997195408', '+5535997195408')).toBe(true)
  })

  it('não bate telefones diferentes', () => {
    expect(phonesMatch('+5535997195408', '+5511900001111')).toBe(false)
  })

  it('não bate quando um dos dois é inválido/vazio', () => {
    expect(phonesMatch('', '+5535997195408')).toBe(false)
    expect(phonesMatch('+5535997195408', '')).toBe(false)
  })
})
