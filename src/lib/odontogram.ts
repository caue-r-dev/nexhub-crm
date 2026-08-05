import type { OdontogramStatus } from '@/lib/supabase/types'

// Notação FDI — permanentes. Layout em quadrantes (visão do profissional).
export const UPPER_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28']
export const LOWER_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38']

export const STATUS_LABEL: Record<OdontogramStatus, string> = {
  saudavel: 'Saudável',
  cariado: 'Cariado',
  restaurado: 'Restaurado',
  ausente: 'Ausente',
  implante: 'Implante',
  canal: 'Canal',
  extracao_indicada: 'Extração indicada',
}

export const STATUS_COLOR: Record<OdontogramStatus, string> = {
  saudavel: '#FFFFFF',
  cariado: '#DC2626',
  restaurado: '#2563EB',
  ausente: '#9CA3AF',
  implante: '#7C3AED',
  canal: '#EA580C',
  extracao_indicada: '#EAB308',
}

export type ToothKind = 'incisor' | 'canine' | 'premolar' | 'molar'

// Posição 1-8 dentro do quadrante (último dígito da notação FDI) define o tipo.
export function toothKind(toothNumber: string): ToothKind {
  const position = Number(toothNumber.slice(-1))
  if (position <= 2) return 'incisor'
  if (position === 3) return 'canine'
  if (position <= 5) return 'premolar'
  return 'molar'
}
