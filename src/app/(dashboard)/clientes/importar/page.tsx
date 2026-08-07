import Link from 'next/link'
import { ImportClientsForm } from '@/components/clientes/ImportClientsForm'

export default function ImportarClientesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Importar clientes</h1>
        <p className="text-text-secondary">Carregamento em massa a partir de uma planilha CSV ou Excel.</p>
      </div>
      <ImportClientsForm />
      <Link href="/clientes" className="self-start text-sm font-medium text-accent">
        ← Voltar pra Clientes
      </Link>
    </div>
  )
}
