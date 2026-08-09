// Vercel bloqueia a env var TZ (nome reservado), então o timezone do
// processo Node é fixado aqui — roda uma vez no boot do servidor, antes de
// qualquer cálculo de data/hora (lembretes, disponibilidade de agenda,
// agendamento público). Sem isso, o servidor roda em UTC e todo horário
// calculado sai 3h adiantado em relação ao horário real da clínica.
export function register() {
  process.env.TZ = 'America/Sao_Paulo'
}
