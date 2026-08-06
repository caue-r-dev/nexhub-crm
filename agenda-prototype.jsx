import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, Rows3, Plus, Clock } from "lucide-react";

// ---- Design tokens (paleta "petróleo" já definida pro NexHub CRM) ----
const T = {
  bg: "#FAFAF9",
  surface: "#FFFFFF",
  accent: "#0F6E56",
  accentSoft: "#E4F1EC",
  text: "#1C1C1A",
  textSecondary: "#5F5E5A",
  border: "#E8E6DF",
};

// Cores de status — fixas, não variam com a paleta do tenant
const STATUS = {
  pendente: { label: "Pendente", color: "#3B82F6", bg: "#EFF6FF" },
  confirmado: { label: "Confirmado", color: "#16A34A", bg: "#F0FDF4" },
  cancelado: { label: "Cancelado", color: "#DC2626", bg: "#FEF2F2" },
};

// Cores de identificação por profissional (não são cor de marca nem de status)
const PROFESSIONALS = [
  { id: "p1", name: "Dra. Jayne Tofoli", initials: "JT", color: "#0F6E56" },
  { id: "p2", name: "Dr. Marcos Lima", initials: "ML", color: "#B45309" },
  { id: "p3", name: "Dra. Ana Souza", initials: "AS", color: "#4F46E5" },
];

const DAY_START = 8; // 08:00
const DAY_END = 19; // 19:00
const SLOT_MIN = 30; // grade de 30 em 30 min
const ROW_H = 56; // px por slot de 30min

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// ---- Dados fictícios ----
const MOCK_APPOINTMENTS = [
  { id: "a1", proId: "p1", client: "Beatriz Nunes", type: "Consulta", start: "08:30", duration: 60, status: "confirmado" },
  { id: "a2", proId: "p1", client: "Rafael Costa", type: "Limpeza", start: "10:00", duration: 45, status: "pendente" },
  { id: "a3", proId: "p1", client: "Sofia Martins", type: "Extração", start: "14:00", duration: 90, status: "confirmado" },
  { id: "a4", proId: "p2", client: "Lucas Andrade", type: "Consulta", start: "09:00", duration: 30, status: "confirmado" },
  { id: "a5", proId: "p2", client: "Helena Ribeiro", type: "Canal", start: "11:00", duration: 90, status: "pendente" },
  { id: "a6", proId: "p2", client: "Igor Barros", type: "Consulta", start: "15:30", duration: 30, status: "cancelado" },
  { id: "a7", proId: "p3", client: "Clara Moreira", type: "Ortodontia", start: "08:00", duration: 45, status: "confirmado" },
  { id: "a8", proId: "p3", client: "Davi Pereira", type: "Consulta", start: "13:00", duration: 30, status: "confirmado" },
];

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function blockStyle(start, duration) {
  const top = ((timeToMinutes(start) - DAY_START * 60) / SLOT_MIN) * ROW_H;
  const height = (duration / SLOT_MIN) * ROW_H - 4;
  return { top: `${top}px`, height: `${Math.max(height, 28)}px` };
}

function AppointmentBlock({ appt, compact }) {
  const s = STATUS[appt.status];
  return (
    <div
      className="absolute left-1 right-1 rounded-md px-2 py-1 overflow-hidden cursor-pointer transition-shadow hover:shadow-md"
      style={{
        ...blockStyle(appt.start, appt.duration),
        backgroundColor: s.bg,
        borderLeft: `3px solid ${s.color}`,
      }}
    >
      <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: T.text }}>
        <Clock size={11} style={{ color: s.color }} />
        {appt.start}
      </div>
      <div className="text-[12px] font-semibold truncate" style={{ color: T.text }}>
        {appt.client}
      </div>
      {!compact && (
        <div className="text-[11px] truncate" style={{ color: T.textSecondary }}>
          {appt.type}
        </div>
      )}
    </div>
  );
}

function TimeGutter() {
  const slots = [];
  for (let h = DAY_START; h < DAY_END; h++) {
    slots.push(h);
  }
  return (
    <div className="flex flex-col shrink-0 w-12 sm:w-14">
      <div style={{ height: 44 }} />
      {slots.map((h) => (
        <div
          key={h}
          className="text-[11px] pr-2 text-right -translate-y-2"
          style={{ height: ROW_H * 2, color: T.textSecondary }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

function GridBackground() {
  const rows = ((DAY_END - DAY_START) * 60) / SLOT_MIN;
  return (
    <div className="absolute inset-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{ height: ROW_H, borderTop: `1px solid ${T.border}` }}
        />
      ))}
    </div>
  );
}

export default function AgendaPrototype() {
  const [view, setView] = useState("dia"); // "dia" | "semana"
  const [visiblePros, setVisiblePros] = useState(PROFESSIONALS.map((p) => p.id));
  const [weekPro, setWeekPro] = useState(PROFESSIONALS[0].id);

  const toggleProfessional = (id) => {
    setVisiblePros((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const activeCols = useMemo(
    () => PROFESSIONALS.filter((p) => visiblePros.includes(p.id)),
    [visiblePros]
  );

  const gridHeight = ((DAY_END - DAY_START) * 60 * ROW_H) / SLOT_MIN;

  return (
    <div className="min-h-screen w-full" style={{ backgroundColor: T.bg, color: T.text }}>
      <div className="max-w-6xl mx-auto p-3 sm:p-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">Agenda</h1>
            <p className="text-xs sm:text-sm" style={{ color: T.textSecondary }}>
              Qua, 5 de agosto de 2026
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg border"
              style={{ borderColor: T.border, backgroundColor: T.surface }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="p-2 rounded-lg border"
              style={{ borderColor: T.border, backgroundColor: T.surface }}
            >
              <ChevronRight size={16} />
            </button>

            <div
              className="flex rounded-lg border overflow-hidden ml-1"
              style={{ borderColor: T.border }}
            >
              <button
                onClick={() => setView("dia")}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium"
                style={{
                  backgroundColor: view === "dia" ? T.accent : T.surface,
                  color: view === "dia" ? "#fff" : T.text,
                }}
              >
                <Rows3 size={14} /> Dia
              </button>
              <button
                onClick={() => setView("semana")}
                className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium"
                style={{
                  backgroundColor: view === "semana" ? T.accent : T.surface,
                  color: view === "semana" ? "#fff" : T.text,
                }}
              >
                <Calendar size={14} /> Semana
              </button>
            </div>

            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium text-white ml-1"
              style={{ backgroundColor: T.accent }}
            >
              <Plus size={14} /> <span className="hidden sm:inline">Novo agendamento</span>
            </button>
          </div>
        </div>

        {/* Filtro de profissionais (visível em ambas as views) */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
          {PROFESSIONALS.map((p) => {
            const active = visiblePros.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggleProfessional(p.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border shrink-0 text-xs font-medium transition-opacity"
                style={{
                  borderColor: active ? p.color : T.border,
                  backgroundColor: active ? `${p.color}14` : T.surface,
                  opacity: active ? 1 : 0.5,
                }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] text-white font-semibold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.initials}
                </span>
                {p.name.split(" ")[0]} {p.name.split(" ")[1]}
              </button>
            );
          })}
        </div>

        {/* Legenda de status */}
        <div className="flex items-center gap-3 mb-3 text-[11px]" style={{ color: T.textSecondary }}>
          {Object.values(STATUS).map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: T.border, backgroundColor: T.surface }}
        >
          {view === "dia" ? (
            <div className="overflow-x-auto">
              <div className="flex min-w-max">
                <TimeGutter />
                <div className="flex">
                  {activeCols.length === 0 && (
                    <div
                      className="flex items-center justify-center w-64 text-sm"
                      style={{ height: gridHeight + 44, color: T.textSecondary }}
                    >
                      Selecione ao menos um profissional
                    </div>
                  )}
                  {activeCols.map((p) => (
                    <div key={p.id} className="flex flex-col w-36 sm:w-44 border-l" style={{ borderColor: T.border }}>
                      <div
                        className="flex items-center gap-1.5 h-11 px-2 border-b sticky top-0"
                        style={{ borderColor: T.border, backgroundColor: T.surface }}
                      >
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-semibold shrink-0"
                          style={{ backgroundColor: p.color }}
                        >
                          {p.initials}
                        </span>
                        <span className="text-xs font-medium truncate">{p.name}</span>
                      </div>
                      <div className="relative" style={{ height: gridHeight }}>
                        <GridBackground />
                        {MOCK_APPOINTMENTS.filter((a) => a.proId === p.id).map((a) => (
                          <AppointmentBlock key={a.id} appt={a} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Semana: um profissional por vez (dropdown) */}
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: T.border }}>
                <span className="text-xs" style={{ color: T.textSecondary }}>
                  Ver agenda de:
                </span>
                <select
                  value={weekPro}
                  onChange={(e) => setWeekPro(e.target.value)}
                  className="text-xs sm:text-sm font-medium rounded-md border px-2 py-1"
                  style={{ borderColor: T.border, backgroundColor: T.surface, color: T.text }}
                >
                  {PROFESSIONALS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto">
                <div className="flex min-w-max">
                  <TimeGutter />
                  <div className="flex">
                    {WEEKDAYS.map((d, i) => (
                      <div key={d} className="flex flex-col w-32 sm:w-40 border-l" style={{ borderColor: T.border }}>
                        <div
                          className="flex flex-col items-center justify-center h-11 border-b"
                          style={{ borderColor: T.border }}
                        >
                          <span className="text-[10px]" style={{ color: T.textSecondary }}>
                            {d}
                          </span>
                          <span className="text-xs font-semibold">{3 + i}</span>
                        </div>
                        <div className="relative" style={{ height: gridHeight }}>
                          <GridBackground />
                          {i === 2 &&
                            MOCK_APPOINTMENTS.filter((a) => a.proId === weekPro).map((a) => (
                              <AppointmentBlock key={a.id} appt={a} compact />
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] mt-3" style={{ color: T.textSecondary }}>
          Protótipo — dados fictícios da Clínica Teste. Toque nos chips acima pra mostrar/ocultar profissionais.
        </p>
      </div>
    </div>
  );
}
