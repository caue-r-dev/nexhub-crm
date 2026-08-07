import * as XLSX from 'xlsx'

// Cabeçalhos usados tanto na exportação quanto na importação — export e
// import fazem roundtrip com o mesmo formato. Import aceita variações de
// caixa/acento (normaliza antes de comparar), então planilha editada por
// fora (Excel/Google Sheets) ainda funciona.
const HEADERS = ['Nome', 'Telefone', 'Documento', 'Nascimento', 'Convênio'] as const

function normalizeHeader(h: string) {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '')
}

// Chaves sem espaço (normalizeHeader remove espaços) — cobre variações reais
// de export de outros CRMs (ex: planilha da Clínicorp usa "Nome completo",
// "Data de nascimento"), não só o formato de export do próprio NexHub.
const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  nome: 'name',
  nomecompleto: 'name',
  telefone: 'phone',
  celular: 'phone',
  documento: 'document',
  cpf: 'document',
  nascimento: 'birthDate',
  datadenascimento: 'birthDate',
  datanascimento: 'birthDate',
  convenio: 'convenio',
  nomedoplano: 'convenio',
}

export type ClientRow = {
  name: string
  phone: string | null
  document: string | null
  birth_date: string | null
  convenio: string | null
}

export function buildClientsWorkbook(clients: ClientRow[]): Buffer {
  const rows = clients.map((c) => ({
    Nome: c.name,
    Telefone: c.phone ?? '',
    Documento: c.document ?? '',
    Nascimento: c.birth_date ?? '',
    Convênio: c.convenio ?? '',
  }))

  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...HEADERS] })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Clientes')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
}

export type ParsedRow = {
  name: string
  phone: string | null
  document: string | null
  birthDate: string | null
  convenio: string | null
}

export type ParseResult = {
  rows: ParsedRow[]
  errors: { line: number; message: string }[]
}

// Nasce: aceita "1990-05-20" (já no formato do banco) ou "20/05/1990"
// (formato que planilha BR/Excel costuma exibir).
function normalizeBirthDate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (brMatch) {
    const [, d, m, y] = brMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

const MAX_ROWS = 5000

export function parseClientsFile(buffer: Buffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return { rows: [], errors: [{ line: 0, message: 'Planilha vazia.' }] }

  const sheet = workbook.Sheets[sheetName]
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false })

  if (raw.length > MAX_ROWS) {
    return { rows: [], errors: [{ line: 0, message: `Máximo de ${MAX_ROWS} linhas por importação.` }] }
  }

  const rows: ParsedRow[] = []
  const errors: ParseResult['errors'] = []

  raw.forEach((rawRow, index) => {
    const line = index + 2 // +1 header, +1 base 1

    // Só usa colunas conhecidas (evita qualquer chave inesperada do arquivo
    // ir parar num objeto que a gente usa depois — mitigação de prototype
    // pollution, já que a lib de parsing tem CVE aberta sem fix).
    const mapped: Partial<ParsedRow> = {}
    for (const [key, value] of Object.entries(rawRow)) {
      const field = HEADER_ALIASES[normalizeHeader(key)]
      // Duas colunas podem cair no mesmo campo (Celular/Telefone ambos viram
      // phone) — não deixa uma coluna vazia mais à direita apagar um valor
      // já capturado por outra coluna com o mesmo alias.
      if (field && typeof value === 'string' && (value.trim() || mapped[field] === undefined)) {
        mapped[field] = value
      }
    }

    const name = mapped.name?.trim()
    if (!name) {
      if (Object.values(rawRow).some((v) => String(v ?? '').trim())) {
        errors.push({ line, message: 'Linha sem nome — ignorada.' })
      }
      return
    }

    const birthDateRaw = mapped.birthDate?.trim()
    let birthDate: string | null = null
    if (birthDateRaw) {
      birthDate = normalizeBirthDate(birthDateRaw)
      if (!birthDate) {
        errors.push({ line, message: `Data de nascimento inválida ("${birthDateRaw}") — importado sem essa data.` })
      }
    }

    rows.push({
      name,
      phone: mapped.phone?.trim() || null,
      document: mapped.document?.trim() || null,
      birthDate,
      convenio: mapped.convenio?.trim() || null,
    })
  })

  return { rows, errors }
}
