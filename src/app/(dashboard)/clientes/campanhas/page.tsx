import { CampaignsPanel } from '@/components/campanhas/CampaignsPanel'

export default function CampanhasPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Campanhas de reengajamento</h1>
        <p className="text-text-secondary">
          Dispare mensagem em massa pra clientes sem visita há um tempo ou com orçamento aberto sem fechar.
        </p>
      </div>
      <CampaignsPanel />
    </div>
  )
}
