import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { InventoryForm } from '@/components/estoque/InventoryForm'
import { InventoryTable } from '@/components/estoque/InventoryTable'

export default async function EstoquePage() {
  const tenant = await getCurrentTenant()
  const supabase = await createClient()

  const { data: items } = tenant
    ? await supabase
        .from('inventory_items')
        .select('id, name, quantity, unit, min_quantity, expires_at, notes')
        .eq('tenant_id', tenant.id)
        .order('expires_at', { ascending: true, nullsFirst: false })
        .order('name')
    : { data: [] }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Estoque</h1>
        <p className="text-text-secondary">Controle de produtos, quantidade e validade.</p>
      </div>

      <InventoryForm />
      <InventoryTable items={items ?? []} />
    </div>
  )
}
