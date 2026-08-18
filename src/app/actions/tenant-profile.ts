'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { geocodeAddress } from '@/lib/geocoding'

export async function updateClinicProfileAction(input: {
  phone: string
  email: string
  address: string
  cnpj: string
  socialMedia: string
  websiteUrl: string
}) {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const trimmedAddress = input.address.trim() || null

  // Só geocoda de novo quando o endereço mudou — evita bater na API do
  // Nominatim toda vez que o usuário salva telefone/e-mail sem mexer no
  // endereço. Falha na geocodificação não bloqueia o salvamento: o mapa
  // no link público só não aparece até o endereço geocodificar com sucesso.
  let latitude = tenant.latitude
  let longitude = tenant.longitude
  if (trimmedAddress !== tenant.address) {
    const coords = trimmedAddress ? await geocodeAddress(trimmedAddress) : null
    latitude = coords?.latitude ?? null
    longitude = coords?.longitude ?? null
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      phone: input.phone.trim() || null,
      email: input.email.trim() || null,
      address: trimmedAddress,
      cnpj: input.cnpj.trim() || null,
      social_media: input.socialMedia.trim() || null,
      website_url: input.websiteUrl.trim() || null,
      latitude,
      longitude,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }
  revalidatePath('/configuracoes/clinica')
}
