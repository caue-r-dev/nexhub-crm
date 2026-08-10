'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

type ModalState = { open: boolean; datetime?: Date; professionalId?: string }

type Ctx = {
  state: ModalState
  openModal: (opts?: { datetime?: Date; professionalId?: string }) => void
  closeModal: () => void
}

const AgendaModalContext = createContext<Ctx | null>(null)

export function AgendaModalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ModalState>({ open: false })

  function openModal(opts?: { datetime?: Date; professionalId?: string }) {
    setState({ open: true, datetime: opts?.datetime, professionalId: opts?.professionalId })
  }
  function closeModal() {
    setState({ open: false })
  }

  return <AgendaModalContext.Provider value={{ state, openModal, closeModal }}>{children}</AgendaModalContext.Provider>
}

export function useAgendaModal() {
  const ctx = useContext(AgendaModalContext)
  if (!ctx) throw new Error('useAgendaModal precisa estar dentro de AgendaModalProvider')
  return ctx
}
