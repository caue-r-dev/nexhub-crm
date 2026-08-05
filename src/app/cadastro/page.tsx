import { CadastroWizard } from '@/components/cadastro/CadastroWizard'
import { getNiches } from '@/lib/niches'

export default async function CadastroPage() {
  const niches = await getNiches()

  return <CadastroWizard niches={niches} />
}
