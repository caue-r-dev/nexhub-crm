'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import type { PaletteType } from '@/lib/supabase/types'

export type OnboardingInput = {
  businessName: string
  nicheId: string
  palette: PaletteType
}

export async function completeOnboardingAction(input: OnboardingInput): Promise<{ error: string } | never> {
  const { businessName, nicheId, palette } = input

  if (!businessName.trim() || !nicheId || !palette) {
    return { error: 'Preencha todos os campos.' }
  }

  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tenants')
    .update({
      name: businessName,
      niche_id: nicheId,
      theme_palette: palette,
      onboarding_completed: true,
    })
    .eq('id', tenant.id)

  if (error) return { error: error.message }

  redirect('/painel')
}
