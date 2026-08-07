import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/cadastro', '/reset-password']
const ONBOARDING_ROUTE = '/onboarding'

export async function proxy(request: NextRequest) {
  // Painel admin tem auth própria (admin_users, checado no layout), separada
  // da sessão de tenant — não aplica aqui o redirect de tenant não-autenticado.
  if (request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

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
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))

  if (!user && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // /reset-password é público mas o link de recovery do Supabase autentica o
  // usuário (sessão temporária só pra trocar a senha) — não pode cair na
  // regra abaixo ou o redirect tira o usuário da tela antes dele trocar.
  if (user && isPublicRoute && pathname !== '/reset-password') {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (user && pathname !== ONBOARDING_ROUTE && !isPublicRoute) {
    const { data: userRow } = await supabase
      .from('users')
      .select('tenants(onboarding_completed)')
      .eq('auth_id', user.id)
      .single()

    const tenant = (Array.isArray(userRow?.tenants) ? userRow.tenants[0] : userRow?.tenants) as
      | { onboarding_completed: boolean }
      | undefined
    if (tenant && !tenant.onboarding_completed) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
    }
  }

  if (user && pathname === ONBOARDING_ROUTE) {
    const { data: userRow } = await supabase
      .from('users')
      .select('tenants(onboarding_completed)')
      .eq('auth_id', user.id)
      .single()

    const tenant = (Array.isArray(userRow?.tenants) ? userRow.tenants[0] : userRow?.tenants) as
      | { onboarding_completed: boolean }
      | undefined
    if (tenant?.onboarding_completed) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
}
