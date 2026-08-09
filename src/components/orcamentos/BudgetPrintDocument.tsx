import { OdontogramStatic } from '@/components/odontograma/OdontogramStatic'
import type { BudgetItem, OdontogramStatus } from '@/lib/supabase/types'

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function BudgetPrintDocument({
  variant,
  tenant,
  professional,
  client,
  budget,
  odontogramRecords,
}: {
  variant: 'total' | 'padrao' | 'completo'
  tenant: { name: string; phone: string | null; email: string | null; address: string | null }
  professional: { name: string; registration_number: string | null } | null
  client: { name: string }
  budget: { created_at: string; total: number; items: BudgetItem[] }
  odontogramRecords: { tooth_number: string; status: OdontogramStatus }[]
}) {
  const dateLabel = new Date(budget.created_at).toLocaleDateString('pt-BR')

  return (
    <div className="flex flex-col gap-6 text-text">
      <header className="border-b border-border pb-4">
        <h1 className="text-lg font-semibold">{tenant.name}</h1>
        <div className="flex flex-col text-sm text-text-secondary">
          {tenant.phone && <span>{tenant.phone}</span>}
          {tenant.email && <span>{tenant.email}</span>}
          {tenant.address && <span>{tenant.address}</span>}
        </div>
      </header>

      <div>
        <h2 className="font-semibold">Plano de tratamento de {client.name}</h2>
        <p className="text-sm text-text-secondary">Orçamento criado em {dateLabel}</p>
      </div>

      {variant !== 'total' && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-text-secondary">Procedimentos</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {budget.items.map((item, i) => (
              <li key={i} className="flex justify-between border-b border-border py-1">
                <span>
                  {item.quantity}x {item.description}
                  {item.tooth_number && <span className="text-text-secondary"> — dente {item.tooth_number}</span>}
                </span>
                {variant === 'completo' && <span>{formatBRL(item.quantity * item.unit_price)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {variant === 'completo' && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-text-secondary">Odontograma</h3>
          <OdontogramStatic records={odontogramRecords} />
        </div>
      )}

      <p className="text-right text-lg font-semibold">Total: {formatBRL(budget.total)}</p>

      <footer className="mt-8 flex flex-col items-center gap-1 border-t border-border pt-4 text-sm text-text-secondary">
        {professional && (
          <>
            <span className="border-t border-text-secondary px-8 pt-1">{professional.name}</span>
            {professional.registration_number && <span>{professional.registration_number}</span>}
          </>
        )}
      </footer>
    </div>
  )
}
