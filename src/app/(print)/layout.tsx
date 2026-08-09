// Sem sidebar/nav do dashboard — só o conteúdo do documento. Autenticação
// já é garantida pelo middleware global (src/proxy.ts): essa rota não está
// em PUBLIC_ROUTES nem OPEN_ROUTES, então já exige sessão como qualquer
// página do (dashboard), sem precisar repetir a checagem aqui.
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-6 py-10 print:px-0 print:py-0">{children}</div>
}
