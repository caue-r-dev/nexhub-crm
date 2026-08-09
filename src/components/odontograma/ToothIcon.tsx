import type { ToothKind } from '@/lib/odontogram'

// Silhueta de dente real (CC0, SVG Repo — https://www.svgrepo.com/svg/75644/tooth-outline),
// não desenhada à mão: coroa arredondada + raiz bifurcada, reaproveitada em
// dois recortes de viewBox — largo pros molares (mais largos na boca de
// verdade), um recorte central mais estreito pros demais tipos.
const TOOTH_PATH = `
  M315.204,32.786c-42.129-49.124-113.851-10.811-124.018-4.996C158.503,5.47,112.842-14.194,76.081,13.835
  C49.654,33.953,34.451,59.927,30.843,91.013c-5.426,46.829,17.823,92.293,29.924,106.968c6.141,7.436,8.267,43.639,9.83,70.084
  c3.317,56.28,6.187,104.904,34.966,111.004c7.349,1.58,14.384,0.279,20.356-3.694c15.499-10.341,20.379-36.239,26.02-66.227
  c7.256-38.597,13.919-68.027,31.121-66.831c5.188,0.36,7.378,2.254,8.696,3.857c8.737,10.585,4.95,42.037,2.167,65.007
  c-4.008,33.334-7.482,62.125,14.46,68.526c1.998,0.559,4.415,1.012,7.191,1.012c4.427,0,9.726-1.127,15.534-4.637
  c33.706-20.285,60.22-107.785,70.468-155.062c26.815-20.855,44.313-51.354,48.252-84.328
  C352.849,111.252,349.306,72.585,315.204,32.786z
`

const VIEWBOX: Record<ToothKind, string> = {
  molar: '0 0 380.719 380.719',
  premolar: '55 0 270 380.719',
  canine: '65 0 250 380.719',
  incisor: '75 0 230 380.719',
}

export function ToothIcon({
  kind,
  upper,
  color,
}: {
  kind: ToothKind
  upper: boolean
  color: string
}) {
  return (
    <svg
      viewBox={VIEWBOX[kind]}
      className="h-14 w-8"
      style={{ transform: upper ? undefined : 'scaleY(-1)' }}
    >
      <path
        d={TOOTH_PATH}
        fill={color}
        stroke="currentColor"
        strokeWidth="8"
        strokeLinejoin="round"
        className="text-text-secondary"
      />
    </svg>
  )
}
