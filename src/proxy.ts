import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/cadastro', '/reset-password']
// Acessível com ou sem sessão — paciente sem conta usa pra marcar consulta
// sozinho, mas funcionário logado também pode abrir pra conferir o próprio
// link. Diferente de PUBLIC_ROUTES: não redireciona quem já está logado.
const OPEN_ROUTES = ['/agendar', '/pesquisa']
const ONBOARDING_ROUTE = '/onboarding'
const TROCAR_SENHA_ROUTE = '/trocar-senha'

export async function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Sempre revalidar sessão — necessário para manter cookies atualizados
  // (inclusive no /admin: sem chamar getUser() aqui o token de sessão nunca
  // é renovado nessas rotas, expira depois de ~1h e força relogar — o
  // painel admin tem auth própria via admin_users, mas ainda precisa desse
  // refresh, só não passa pelo redirect de tenant abaixo).
  const { data: { user } } = await supabase.auth.getUser()

  if (isAdminRoute) {
    return response
  }

  const { pathname } = request.nextUrl
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const isOpenRoute = OPEN_ROUTES.some((route) => pathname.startsWith(route))

  if (!user && !isPublicRoute && !isOpenRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isOpenRoute) {
    return response
  }

  // /reset-password é público mas o link de recovery do Supabase autentica o
  // usuário (sessão temporária só pra trocar a senha) — não pode cair na
  // regra abaixo ou o redirect tira o usuário da tela antes dele trocar.
  if (user && isPublicRoute && pathname !== '/reset-password') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && !isPublicRoute) {
    const { data: userRow } = await supabase
      .from('users')
      .select('must_change_password, tenants(onboarding_completed)')
      .eq('auth_id', user.id)
      .single()

    const tenant = (Array.isArray(userRow?.tenants) ? userRow.tenants[0] : userRow?.tenants) as
      | { onboarding_completed: boolean }
      | undefined

    // Senha temporária gerada pelo admin — bloqueia tudo até o cliente trocar,
    // antes até da checagem de onboarding.
    if (userRow?.must_change_password && pathname !== TROCAR_SENHA_ROUTE) {
      return NextResponse.redirect(new URL(TROCAR_SENHA_ROUTE, request.url))
    }
    if (!userRow?.must_change_password && pathname === TROCAR_SENHA_ROUTE) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // Onboarding só é checado depois da troca de senha resolvida — senão
    // um usuário com must_change_password=true e onboarding pendente cai
    // num loop infinito entre /trocar-senha e /onboarding (cada rota
    // redireciona pra outra), confirmado em produção com o "This page
    // couldn't load" do Chrome.
    if (!userRow?.must_change_password) {
      if (pathname !== ONBOARDING_ROUTE && tenant && !tenant.onboarding_completed) {
        return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
      }
      if (pathname === ONBOARDING_ROUTE && tenant?.onboarding_completed) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
}
