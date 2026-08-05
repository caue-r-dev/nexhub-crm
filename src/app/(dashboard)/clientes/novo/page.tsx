import { ClientForm } from '@/components/clientes/ClientForm'

export default function NovoClientePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Novo cliente</h1>
      <ClientForm />
    </div>
  )
}
