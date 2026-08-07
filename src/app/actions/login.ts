'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(input: { email: string; password: string }) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(input)

  if (error) {
    return { error: error.message }
  }

  redirect('/')
}

export async function forgotPasswordAction(
  input: { email: string }
): Promise<{ error: string } | { ok: true }> {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')

  const { error } = await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${origin}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { ok: true }
}
