import { PackageForm } from '@/components/clientes/PackageForm'

export default async function NovoPacotePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Novo pacote</h1>
      <PackageForm clientId={id} />
    </div>
  )
}
