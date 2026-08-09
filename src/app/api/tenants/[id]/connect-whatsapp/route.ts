import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getCurrentAdmin } from '@/lib/admin'
import { getCurrentTenant } from '@/lib/tenant'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  createPlatformAccount,
  createPlatformUser,
  linkAccountUser,
  findInboxByName,
  createConversationWebhook,
  deleteImportStatusConversation,
} from '@/lib/chatwoot-platform'
import { createInstanceWithChatwoot, getInstanceQrCode, getConnectionState, deleteInstance } from '@/lib/evolution-admin'

// WhatsApp desloga sozinho de vez em quando (usuário some/troca de aparelho,
// sessão expira, ou o servidor derruba a conexão) — nesse caso o tenant já
// tem chatwoot_account_id + evolution_instance_name configurados, só precisa
// de um QR novo pra re-parear, não recriar conta/inbox do zero.

// Onboarding automático de WhatsApp por tenant — usa credenciais de
// plataforma (Chatwoot Platform API + Evolution API global), mas quem chama
// é o próprio tenant (dono do id) ou um admin. Nunca devolve token/segredo
// pro client, só o QR temporário e o status de conexão.

function instanceNameFor(tenantId: string) {
  return `nexhub-${tenantId.slice(0, 8)}`
}

// Chamar /instance/connect de novo enquanto a tentativa anterior ainda não
// assentou faz o Baileys abrir um segundo socket pra mesma sessão — os dois
// brigam entre si e o WhatsApp derruba a conexão de vez (loop de "conflict:
// replaced" só resolvido reiniciando o container inteiro na Evolution, ver
// [[feedback_evolution_ghost_socket_restart]]). Trava aqui pra nosso próprio
// app nunca ser a causa disso de novo.
const QR_COOLDOWN_MS = 15_000

function qrCooldownRemaining(lastRequestedAt: string | null): number {
  if (!lastRequestedAt) return 0
  const elapsed = Date.now() - new Date(lastRequestedAt).getTime()
  return elapsed < QR_COOLDOWN_MS ? Math.ceil((QR_COOLDOWN_MS - elapsed) / 1000) : 0
}

async function authorize(tenantId: string): Promise<boolean> {
  const admin = await getCurrentAdmin()
  if (admin) return true

  const tenant = await getCurrentTenant()
  return tenant?.id === tenantId
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params
  if (!(await authorize(tenantId))) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const db = createAdminClient()

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, chatwoot_account_id, evolution_instance_name, whatsapp_qr_requested_at')
    .eq('id', tenantId)
    .single()
  if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 })

  if (tenant.chatwoot_account_id) {
    if (!tenant.evolution_instance_name) {
      return NextResponse.json({ error: 'Esse tenant já tem WhatsApp configurado.' }, { status: 409 })
    }

    const cooldown = qrCooldownRemaining(tenant.whatsapp_qr_requested_at)
    if (cooldown > 0) {
      return NextResponse.json({ error: `Aguarde ${cooldown}s antes de tentar de novo.` }, { status: 429 })
    }

    // Já tem conta Chatwoot + instância Evolution — só desconectado. Reusa
    // a instância existente pra pegar um QR novo, sem recriar nada no Chatwoot.
    try {
      const state = await getConnectionState(tenant.evolution_instance_name)
      if (state === 'open') {
        return NextResponse.json({ error: 'Esse tenant já tem WhatsApp conectado.' }, { status: 409 })
      }
      await db.from('tenants').update({ whatsapp_qr_requested_at: new Date().toISOString() }).eq('id', tenantId)
      const qr = await getInstanceQrCode(tenant.evolution_instance_name)
      return NextResponse.json({ qrCode: qr.base64 })
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro desconhecido.' }, { status: 500 })
    }
  }

  const chatwootBaseUrl = process.env.CHATWOOT_BASE_URL!
  const evolutionBaseUrl = process.env.EVOLUTION_BASE_URL!
  const evolutionApiKey = process.env.EVOLUTION_API_KEY!
  const instanceName = instanceNameFor(tenant.id)

  try {
    const account = await createPlatformAccount(tenant.name)

    const password = `${randomBytes(24).toString('base64url')}!A1`
    const user = await createPlatformUser({
      name: tenant.name,
      email: `tenant-${tenant.id}@nexhub.internal`,
      password,
    })

    await linkAccountUser(account.id, user.id, 'administrator')

    let qr = await createInstanceWithChatwoot({
      instanceName,
      chatwootAccountId: account.id,
      chatwootToken: user.access_token,
      chatwootUrl: chatwootBaseUrl,
      chatwootNameInbox: tenant.name,
    })

    // /instance/create nem sempre devolve o QR inline (depende da versão/
    // timing da Evolution API) — /instance/connect é o fallback confiável.
    if (!qr.base64) {
      qr = await getInstanceQrCode(instanceName)
    }

    // Evolution cria o inbox via autoCreate de forma assíncrona — dá uma
    // folga curta antes de tentar achar o id, sem bloquear a resposta se
    // ainda não tiver propagado (fica null, corrigível depois).
    await new Promise((r) => setTimeout(r, 2000))
    const inboxId = await findInboxByName(account.id, user.access_token, tenant.name)

    // Webhook pra saber quando o paciente responde "sim"/"não" confirmando
    // ou cancelando a consulta pelo próprio WhatsApp (ver
    // src/app/api/webhooks/chatwoot/route.ts). Best-effort — se falhar, o
    // resto do fluxo de conexão do WhatsApp não deve travar por causa disso.
    try {
      await createConversationWebhook(account.id, user.access_token, `${new URL(req.url).origin}/api/webhooks/chatwoot`)
    } catch {
      // segue sem webhook — confirmação automática por texto fica indisponível
      // pra esse tenant até reconectar, mas o WhatsApp em si funciona normal.
    }

    const { error: updateError } = await db
      .from('tenants')
      .update({
        chatwoot_account_id: account.id,
        chatwoot_api_token: user.access_token,
        chatwoot_base_url: chatwootBaseUrl,
        chatwoot_inbox_id: inboxId,
        evolution_instance_name: instanceName,
        evolution_base_url: evolutionBaseUrl,
        evolution_api_key: evolutionApiKey,
      })
      .eq('id', tenant.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ qrCode: qr.base64 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro desconhecido.' }, { status: 500 })
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params
  if (!(await authorize(tenantId))) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const db = createAdminClient()

  const { data: tenant } = await db
    .from('tenants')
    .select('evolution_instance_name, chatwoot_account_id, chatwoot_api_token, whatsapp_qr_requested_at')
    .eq('id', tenantId)
    .single()

  if (!tenant?.evolution_instance_name) {
    return NextResponse.json({ error: 'Instância ainda não criada.' }, { status: 404 })
  }

  try {
    // Só checa o estado da conexão — NÃO chama /instance/connect aqui.
    // O WhatsApp/Baileys tem limite de regeneração de QR: se o polling
    // pedir um QR novo a cada poucos segundos, o número atinge o limite
    // e a conexão trava de vez ("QRCode generation limit reached"). O QR
    // mostrado é o único gerado no POST inicial; só refaz sob pedido
    // explícito do usuário (ver query param abaixo).
    const state = await getConnectionState(tenant.evolution_instance_name)
    if (state === 'open') {
      if (tenant.chatwoot_account_id && tenant.chatwoot_api_token) {
        await deleteImportStatusConversation(tenant.chatwoot_account_id, tenant.chatwoot_api_token).catch(() => {})
      }
      return NextResponse.json({ status: state })
    }

    const url = new URL(req.url)
    if (url.searchParams.get('refreshQr') === '1') {
      const cooldown = qrCooldownRemaining(tenant.whatsapp_qr_requested_at)
      if (cooldown > 0) {
        return NextResponse.json({ status: state, error: `Aguarde ${cooldown}s antes de gerar outro QR.` }, { status: 429 })
      }
      await db.from('tenants').update({ whatsapp_qr_requested_at: new Date().toISOString() }).eq('id', tenantId)
      const qr = await getInstanceQrCode(tenant.evolution_instance_name)
      return NextResponse.json({ status: state, qrCode: qr.base64 })
    }

    return NextResponse.json({ status: state })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro desconhecido.' }, { status: 500 })
  }
}

// Desconecta o WhatsApp: apaga a instância na Evolution (sessão Baileys) e
// zera os campos do tenant, deixando pronto pra conectar de novo do zero
// (POST recria conta/inbox Chatwoot + instância). Precisa zerar
// chatwoot_account_id também — o guard do POST usa esse campo pra saber se
// já tem WhatsApp configurado, e manter ele setado sem instância Evolution
// deixaria o tenant preso (POST recusa, e não tem instância pra conectar).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tenantId } = await params
  if (!(await authorize(tenantId))) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
  const db = createAdminClient()

  const { data: tenant } = await db
    .from('tenants')
    .select('evolution_instance_name')
    .eq('id', tenantId)
    .single()

  if (!tenant?.evolution_instance_name) {
    return NextResponse.json({ error: 'Nenhuma instância conectada.' }, { status: 404 })
  }

  try {
    await deleteInstance(tenant.evolution_instance_name)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro desconhecido.' }, { status: 500 })
  }

  const { error: updateError } = await db
    .from('tenants')
    .update({
      evolution_instance_name: null,
      evolution_base_url: null,
      evolution_api_key: null,
      chatwoot_account_id: null,
      chatwoot_api_token: null,
      chatwoot_base_url: null,
      chatwoot_inbox_id: null,
    })
    .eq('id', tenantId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
