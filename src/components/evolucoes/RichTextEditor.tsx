'use client'

import { useRef, useState } from 'react'

export function RichTextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Só usa `value` como conteúdo inicial (uma vez, na montagem) — recolocar
  // dangerouslySetInnerHTML a cada render some com a posição do cursor e
  // faz o navegador reinserir cada tecla digitada no início, invertendo o texto.
  // Reset externo (limpar o form) é feito remontando via `key`, não por aqui.
  const [initialHtml] = useState(value)

  function exec(command: string) {
    ref.current?.focus()
    document.execCommand(command)
    onChange(ref.current?.innerHTML ?? '')
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex gap-1 border-b border-border p-1.5">
        <button type="button" onClick={() => exec('bold')} className="w-7 rounded font-bold text-text hover:bg-bg">
          B
        </button>
        <button type="button" onClick={() => exec('italic')} className="w-7 rounded italic text-text hover:bg-bg">
          I
        </button>
        <button
          type="button"
          onClick={() => exec('underline')}
          className="w-7 rounded text-text underline hover:bg-bg"
        >
          U
        </button>
        <button
          type="button"
          onClick={() => exec('insertUnorderedList')}
          className="rounded px-1.5 text-sm text-text hover:bg-bg"
        >
          Lista
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className="empty:before:content-[attr(data-placeholder)] min-h-24 px-3 py-2 text-sm text-text outline-none empty:before:text-text-secondary [&_ul]:list-disc [&_ul]:pl-5"
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onPaste={(e) => {
          e.preventDefault()
          const text = e.clipboardData.getData('text/plain')
          document.execCommand('insertText', false, text)
        }}
        dangerouslySetInnerHTML={{ __html: initialHtml }}
      />
    </div>
  )
}
