'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { parseClientsFile } from '@/lib/clients-spreadsheet'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export type ImportSummary = {
  imported: number
  skippedDuplicates: number
  errors: { line: number; message: string }[]
}

export async function importClientsAction(formData: FormData): Promise<ImportSummary | { error: string }> {
  const tenant = await getCurrentTenant()
  if (!tenant) return { error: 'Sessão inválida.' }

  const file = formData.get('file')
  if (!(file instanceof File)) return { error: 'Selecione um arquivo.' }
  if (file.size > MAX_FILE_SIZE) return { error: 'Arquivo maior que 5MB.' }

  const buffer = Buffer.from(await file.arrayBuffer())

  let parsed: ReturnType<typeof parseClientsFile>
  try {
    parsed = parseClientsFile(buffer)
  } catch {
    return { error: 'Não consegui ler esse arquivo — confirme que é um .csv ou .xlsx válido.' }
  }

  if (parsed.rows.length === 0) {
    return { imported: 0, skippedDuplicates: 0, errors: parsed.errors }
  }

  const supabase = await createClient()

  const { data: existing } = await supabase.from('clients').select('phone').not('phone', 'is', null)
  const existingPhones = new Set((existing ?? []).map((c) => c.phone))

  const toInsert: {
    tenant_id: string
    name: string
    phone: string | null
    document: string | null
    birth_date: string | null
    convenio: string | null
  }[] = []
  let skippedDuplicates = 0

  for (const row of parsed.rows) {
    if (row.phone && existingPhones.has(row.phone)) {
      skippedDuplicates++
      continue
    }
    if (row.phone) existingPhones.add(row.phone)

    toInsert.push({
      tenant_id: tenant.id,
      name: row.name,
      phone: row.phone,
      document: row.document,
      birth_date: row.birthDate,
      convenio: row.convenio,
    })
  }

  const errors = [...parsed.errors]

  if (toInsert.length > 0) {
    const { error } = await supabase.from('clients').insert(toInsert)
    if (error) return { error: error.message }
  }

  revalidatePath('/clientes')

  return { imported: toInsert.length, skippedDuplicates, errors }
}
