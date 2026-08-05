'use client'

import { useState } from 'react'
import { Plus, User } from 'lucide-react'

// Múltiplos profissionais por tenant é planejado, não implementado (ver task_plan6.md,
// seção "Múltiplos profissionais por tenant"). Só o profissional dono aparece por enquanto
// (nome do tenant como placeholder, já que não há tabela `professionals` nem campo de nome
// de usuário ainda) — o botão fica visível desde já, mas só mostra "Em breve" ao clicar,
// sem trabalho de backend especulativo.
export function ProfessionalsBar({ ownerName }: { ownerName: string }) {
  const [showToast, setShowToast] = useState(false)

  function handleClick() {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2500)
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pr-3 pl-1.5">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent">
          <User className="h-3.5 w-3.5" />
        </div>
        <span className="text-sm font-medium text-text">{ownerName}</span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-sm text-text-secondary hover:text-text"
        >
          <Plus className="h-3.5 w-3.5" />
          Adicionar profissional
        </button>

        {showToast && (
          <div className="absolute top-full left-0 z-10 mt-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs whitespace-nowrap text-text shadow-md">
            Em breve
          </div>
        )}
      </div>
    </div>
  )
}
