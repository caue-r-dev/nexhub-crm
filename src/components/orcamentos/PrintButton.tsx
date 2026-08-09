'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden fixed right-6 top-6 rounded-lg bg-accent px-4 py-2 font-medium text-white shadow-lg"
    >
      Imprimir
    </button>
  )
}
