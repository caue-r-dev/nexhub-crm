import type { PaletteType } from '@/lib/supabase/types'

export const PALETTES: Record<
  PaletteType,
  {
    label: string
    bg: string
    surface: string
    accent: string
    text: string
    textSecondary: string
    border: string
  }
> = {
  petroleo: {
    label: 'Verde-petróleo',
    bg: '#fafaf9',
    surface: '#ffffff',
    accent: '#0f6e56',
    text: '#1c1c1a',
    textSecondary: '#5f5e5a',
    border: '#e8e6df',
  },
  bege: {
    label: 'Bege / terracota',
    bg: '#faf8f5',
    surface: '#ffffff',
    accent: '#b45309',
    text: '#292420',
    textSecondary: '#78716c',
    border: '#ede6dc',
  },
  neutro: {
    label: 'Neutro',
    bg: '#ffffff',
    surface: '#fafafa',
    accent: '#4f46e5',
    text: '#18181b',
    textSecondary: '#71717a',
    border: '#e4e4e7',
  },
}
