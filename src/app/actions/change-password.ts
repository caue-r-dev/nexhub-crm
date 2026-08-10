'use server'

import { createClient } from '@/lib/supabase/server'

export async function changeTempPasswordAction(
  newPassword: string
): Promise<{ error: string } | { ok: true }> {
  if (newPassword.length < 8) {
    return { error: 'Senha precisa ter pelo menos 8 caracteres.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sessão inválida.' }

  const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
  if (passwordError) return { error: passwordError.message }

  const { error: flagError } = await supabase
    .from('users')
    .update({ must_change_password: false })
    .eq('auth_id', user.id)
  if (flagError) return { error: flagError.message }

  return { ok: true }
}
