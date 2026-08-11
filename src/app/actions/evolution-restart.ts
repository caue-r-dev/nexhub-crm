'use server'

import { getCurrentAdmin } from '@/lib/admin'

// Reinicia o container inteiro da Evolution na VPS — corrige o bug conhecido
// de "socket fantasma" (state mente 'open' mas envio real falha com
// "Connection Closed"). Afeta TODOS os tenants ao mesmo tempo (reconexão
// leva alguns segundos pra todo mundo), por isso fica restrito a admin, não
// exposto pro tenant clicar sozinho.
export async function restartEvolutionAction() {
  const admin = await getCurrentAdmin()
  if (!admin) return { error: 'Apenas admin pode reiniciar o WhatsApp.' }

  const url = process.env.RESTART_EVOLUTION_URL
  const token = process.env.RESTART_EVOLUTION_TOKEN
  if (!url || !token) return { error: 'Serviço de restart não configurado.' }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'X-Restart-Token': token },
    })
    if (!res.ok) {
      const body = await res.text()
      return { error: `Falha ao reiniciar: ${body}` }
    }
    return { ok: true }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Erro ao chamar o serviço de restart.' }
  }
}
