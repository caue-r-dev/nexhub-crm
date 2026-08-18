// Geocoding gratuito via Nominatim/OpenStreetMap — sem API key. Uso da
// API exige um User-Agent identificável (política de uso do Nominatim);
// best-effort: qualquer falha (rede, endereço não encontrado) retorna
// null em vez de lançar, pra nunca travar o salvamento do cadastro.
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'NexHub CRM (contato@nexvix.com.br)'

export async function geocodeAddress(
  address: string,
  fetchImpl: typeof fetch = fetch
): Promise<{ latitude: number; longitude: number } | null> {
  const trimmed = address.trim()
  if (!trimmed) return null

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(trimmed)}`
    const res = await fetchImpl(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null

    const results = (await res.json()) as Array<{ lat: string; lon: string }>
    const first = results[0]
    if (!first) return null

    return { latitude: Number(first.lat), longitude: Number(first.lon) }
  } catch {
    return null
  }
}
