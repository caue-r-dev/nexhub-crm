import { ProfessionalForm } from '@/components/agenda/ProfessionalForm'

export default function NovoProfissionalPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-text">Novo profissional</h1>
      <ProfessionalForm />
    </div>
  )
}
