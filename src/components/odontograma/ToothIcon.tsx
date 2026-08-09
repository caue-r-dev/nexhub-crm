import type { ToothKind } from '@/lib/odontogram'

// Placeholder neutro (sem tentar desenhar dente) — 4 tentativas de silhueta
// anatômica reprovadas visualmente. Até termos um SVG real (arquivo de
// designer/site de ícones) pra usar sem reinterpretar, fica um marcador
// simples: quadrado arredondado preenchido pela cor de status.
export function ToothIcon({
  kind: _kind,
  upper: _upper,
  color,
}: {
  kind: ToothKind
  upper: boolean
  color: string
}) {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8">
      <rect
        x="1.5"
        y="1.5"
        width="21"
        height="21"
        rx="5"
        fill={color}
        stroke="currentColor"
        strokeWidth="1.2"
        className="text-text-secondary"
      />
    </svg>
  )
}
