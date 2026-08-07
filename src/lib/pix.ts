import { createStaticPix, hasError } from 'pix-utils'
import QRCode from 'qrcode'

export async function generatePixQr({
  pixKey,
  receiverName,
  amount,
  txid,
}: {
  pixKey: string
  receiverName: string
  amount: number
  txid: string
}): Promise<{ error: string } | { brCode: string; qrImage: string }> {
  const pix = createStaticPix({
    pixKey,
    merchantName: receiverName.slice(0, 25),
    merchantCity: 'BRASIL',
    transactionAmount: amount,
    txid: txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || undefined,
  })

  if (hasError(pix)) {
    return { error: pix.message }
  }

  const brCode = pix.toBRCode()
  const qrImage = await QRCode.toDataURL(brCode, { width: 240, margin: 1 })

  return { brCode, qrImage }
}
