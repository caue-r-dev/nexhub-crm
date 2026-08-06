import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getCurrentAdmin } from '@/lib/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPlatformAccount, createPlatformUser, linkAccountUser, findInboxByName } from '@/lib/chatwoot-platform'
import { createInstanceWithChatwoot, getInstanceQrCode, getConnectionState } from '@/lib/evolution-admin'

// Onboarding automático de WhatsApp por tenant — só acessível pelo painel
// admin (usa credenciais de plataforma: Chatwoot Platform API + Evolution
// API global). Nunca deve ser exposto/chamado a partir do app do tenant.

function instanceNameFor(tenantId: string) {
  return `nexhub-${tenantId.slice(0, 8)}`
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id: tenantId } = await params
  const db = createAdminClient()

  const { data: tenant } = await db.from('tenants').select('id, name, chatwoot_account_id').eq('id', tenantId).single()
  if (!tenant) return NextResponse.json({ error: 'Tenant não encontrado.' }, { status: 404 })
  if (tenant.chatwoot_account_id) {
    return NextResponse.json({ error: 'Esse tenant já tem WhatsApp configurado.' }, { status: 409 })
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

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin()
  if (!admin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id: tenantId } = await params
  const db = createAdminClient()

  const { data: tenant } = await db
    .from('tenants')
    .select('evolution_instance_name')
    .eq('id', tenantId)
    .single()

  if (!tenant?.evolution_instance_name) {
    return NextResponse.json({ error: 'Instância ainda não criada.' }, { status: 404 })
  }

  try {
    const state = await getConnectionState(tenant.evolution_instance_name)
    if (state === 'open') {
      return NextResponse.json({ status: state })
    }

    const qr = await getInstanceQrCode(tenant.evolution_instance_name)
    return NextResponse.json({ status: state, qrCode: qr.base64 })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro desconhecido.' }, { status: 500 })
  }
}
