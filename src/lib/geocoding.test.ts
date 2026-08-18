import { describe, it, expect, vi } from 'vitest'
import { geocodeAddress } from './geocoding'

describe('geocodeAddress', () => {
  it('retorna lat/lng quando a API acha o endereço', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-22.4103', lon: '-46.6844' }],
    })
    const result = await geocodeAddress('Av. Brasil, 1200, Jacutinga - MG', fetchMock as unknown as typeof fetch)
    expect(result).toEqual({ latitude: -22.4103, longitude: -46.6844 })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('https://nominatim.openstreetmap.org/search'),
      expect.objectContaining({ headers: expect.objectContaining({ 'User-Agent': expect.any(String) }) })
    )
  })

  it('retorna null quando a API não acha nada', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })
    const result = await geocodeAddress('endereço inexistente', fetchMock as unknown as typeof fetch)
    expect(result).toBeNull()
  })

  it('retorna null quando a chamada falha (nunca lança)', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('timeout'))
    const result = await geocodeAddress('Av. Brasil, 1200', fetchMock as unknown as typeof fetch)
    expect(result).toBeNull()
  })

  it('retorna null pra endereço vazio sem chamar a API', async () => {
    const fetchMock = vi.fn()
    const result = await geocodeAddress('   ', fetchMock as unknown as typeof fetch)
    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('passa um AbortSignal com timeout pra não travar o salvamento se a API não responder', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ lat: '-22.4103', lon: '-46.6844' }],
    })
    await geocodeAddress('Av. Brasil, 1200, Jacutinga - MG', fetchMock as unknown as typeof fetch)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })
})
