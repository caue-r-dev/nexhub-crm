import { sendWhatsAppText } from '@/lib/evolution'

type TenantWelcomeFields = {
  name: string
  welcome_message: string | null
  evolution_base_url: string | null
  evolution_api_key: string | null
  evolution_instance_name: string | null
}

function renderTemplate(template: string, vars: { nome: string; clinica: string }) {
  return template
    .replace(/{{\s*nome\s*}}/g, vars.nome)
    .replace(/{{\s*clinica\s*}}/g, vars.clinica)
}

// Best-effort: chamado logo após criar um cliente novo (cadastro manual no
// CRM ou primeiro agendamento pelo link público). Falha no envio não pode
// quebrar o fluxo de criação do cliente/agendamento.
export async function sendWelcomeMessageIfConfigured(
  tenant: TenantWelcomeFields,
  client: { name: string; phone: string | null }
): Promise<void> {
  if (!tenant.welcome_message?.trim()) return
  if (!client.phone) return
  if (!tenant.evolution_base_url || !tenant.evolution_api_key || !tenant.evolution_instance_name) return

  const firstName = client.name.trim().split(' ')[0]
  const message = renderTemplate(tenant.welcome_message, { nome: firstName, clinica: tenant.name })

  try {
    await sendWhatsAppText(
      { baseUrl: tenant.evolution_base_url, apiKey: tenant.evolution_api_key, instanceName: tenant.evolution_instance_name },
      client.phone,
      message
    )
  } catch {
    // Best-effort — cliente já foi criado, não derruba o fluxo.
  }
}
