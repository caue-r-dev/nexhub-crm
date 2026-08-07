'use server'

import { getCurrentTenant } from '@/lib/tenant'
import { generatePixQr } from '@/lib/pix'

export async function generateSubscriptionPixAction(): Promise<
  { error: string } | { qrImage: string; brCode: string; amount: number }
> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }
  if (!tenant.monthly_price) return { error: 'Valor da assinatura não configurado — fale com o suporte.' }

  const pixKey = process.env.ADMIN_PIX_KEY
  const receiverName = process.env.ADMIN_PIX_RECEIVER_NAME
  if (!pixKey || !receiverName) return { error: 'PIX de renovação não configurado — fale com o suporte.' }

  const result = await generatePixQr({
    pixKey,
    receiverName,
    amount: tenant.monthly_price,
    txid: tenant.id,
  })

  if ('error' in result) return { error: result.error }

  return { qrImage: result.qrImage, brCode: result.brCode, amount: tenant.monthly_price }
}
