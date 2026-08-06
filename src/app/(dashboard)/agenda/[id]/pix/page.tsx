import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { generatePixQr } from '@/lib/pix'
import { DepositAmountForm } from '@/components/agenda/DepositAmountForm'
import { CopyBrCode } from '@/components/agenda/CopyBrCode'
import { MarkPaidButton } from '@/components/agenda/MarkPaidButton'

const PAYMENT_LABEL: Record<string, string> = {
  nao_solicitado: 'Não solicitado',
  aguardando: 'Aguardando pagamento',
  confirmado: 'Pago',
}

export default async function AppointmentPixPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const tenant = await getCurrentTenant()

  const { data: appointment } = await supabase
    .from('appointments')
    .select('id, title, deposit_amount, payment_status, clients(name)')
    .eq('id', id)
    .single()

  if (!appointment) notFound()

  const clientName = (appointment.clients as { name: string } | null)?.name ?? appointment.title ?? 'Agendamento'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Pix — {clientName}</h1>
        <p className="text-text-secondary">
          Status: <span className="font-medium text-text">{PAYMENT_LABEL[appointment.payment_status]}</span>
        </p>
      </div>

      {!tenant?.pix_key ? (
        <div className="max-w-md rounded-xl border border-border bg-surface p-4 text-text-secondary">
          Você ainda não configurou uma chave Pix.{' '}
          <Link href="/configuracoes/pix" className="font-medium text-accent">
            Configurar agora
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <DepositAmountForm appointmentId={appointment.id} initialAmount={appointment.deposit_amount} />

          {appointment.deposit_amount && (
            <PixQrDisplay
              pixKey={tenant.pix_key}
              receiverName={tenant.pix_receiver_name ?? tenant.name}
              amount={appointment.deposit_amount}
              appointmentId={appointment.id}
            />
          )}

          {appointment.deposit_amount && appointment.payment_status !== 'confirmado' && (
            <MarkPaidButton appointmentId={appointment.id} />
          )}
        </div>
      )}
    </div>
  )
}

async function PixQrDisplay({
  pixKey,
  receiverName,
  amount,
  appointmentId,
}: {
  pixKey: string
  receiverName: string
  amount: number
  appointmentId: string
}) {
  const result = await generatePixQr({ pixKey, receiverName, amount, txid: appointmentId })

  if ('error' in result) {
    return <p className="text-sm text-status-cancelled">Erro ao gerar QR: {result.error}</p>
  }

  return (
    <div className="flex max-w-md flex-col gap-4 rounded-xl border border-border bg-surface p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={result.qrImage} alt="QR Code Pix" className="h-60 w-60 self-center" />
      <CopyBrCode brCode={result.brCode} />
    </div>
  )
}
