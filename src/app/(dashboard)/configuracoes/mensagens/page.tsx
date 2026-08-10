import { MessageTemplatesForm } from '@/components/configuracoes/MessageTemplatesForm'

export default function MensagensConfigPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-text">Mensagens automáticas</h1>
        <p className="text-text-secondary">
          Textos usados pelo bot de primeiro contato e pelas automações. Variáveis disponíveis:{' '}
          <code>{'{{nome_clinica}}'}</code>, <code>{'{{endereco}}'}</code>, <code>{'{{horario_atendimento}}'}</code>,{' '}
          <code>{'{{nome_profissional}}'}</code>, <code>{'{{valor_consulta}}'}</code>, <code>{'{{nome_paciente}}'}</code>,{' '}
          <code>{'{{data_consulta}}'}</code>, <code>{'{{horario_consulta}}'}</code>, <code>{'{{procedimento}}'}</code>,{' '}
          <code>{'{{link_agendamento}}'}</code>.
        </p>
      </div>
      <MessageTemplatesForm />
    </div>
  )
}
