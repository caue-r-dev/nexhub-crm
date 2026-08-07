import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { buildClientsWorkbook } from '@/lib/clients-spreadsheet'

export async function GET() {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })

  const supabase = await createClient()
  const { data: clients, error } = await supabase
    .from('clients')
    .select('name, phone, document, birth_date, convenio')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const buffer = buildClientsWorkbook(clients ?? [])

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="clientes.xlsx"',
    },
  })
}
