"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Tarjeta, btnPrimario, btnSecundario, inputCls, labelCls } from "@/components/ui";
import { DIAS } from "@/lib/mentoria";

type Bloque = { id?: number; weekday: number; start_time: string; end_time: string };

export default function Editor({
  userId, bloquesIniciales, bloqueadasIniciales, maxSemana, duracion,
}: {
  userId: string;
  bloquesIniciales: Bloque[];
  bloqueadasIniciales: string[];
  maxSemana: number;
  duracion: number;
}) {
  const [bloques, setBloques] = useState<Bloque[]>(bloquesIniciales);
  const [bloqueadas, setBloqueadas] = useState<string[]>(bloqueadasIniciales);
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [max, setMax] = useState(maxSemana);
  const [dur, setDur] = useState(duracion);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  const agregar = (weekday: number) =>
    setBloques([...bloques, { weekday, start_time: "16:00", end_time: "18:00" }]);
  const cambiar = (i: number, campo: "start_time" | "end_time", v: string) =>
    setBloques(bloques.map((b, j) => (j === i ? { ...b, [campo]: v } : b)));
  const quitar = (i: number) => setBloques(bloques.filter((_, j) => j !== i));

  async function guardar() {
    setMsg(null);
    if (bloques.some((b) => b.end_time <= b.start_time)) {
      return setMsg({ ok: false, texto: "En cada bloque, la hora final debe ser después de la inicial." });
    }
    setGuardando(true);
    const supabase = createClient();
    const r1 = await supabase.from("availability").delete().eq("mentor_id", userId);
    const r2 = bloques.length
      ? await supabase.from("availability").insert(
          bloques.map((b) => ({ mentor_id: userId, weekday: b.weekday, start_time: b.start_time, end_time: b.end_time })),
        )
      : { error: null };
    const r3 = await supabase.from("blocked_dates").delete().eq("mentor_id", userId);
    const r4 = bloqueadas.length
      ? await supabase.from("blocked_dates").insert(bloqueadas.map((date) => ({ mentor_id: userId, date })))
      : { error: null };
    const r5 = await supabase
      .from("profiles")
      .update({ max_sessions_per_week: max, session_duration_min: dur })
      .eq("id", userId);
    setGuardando(false);
    const err = r1.error || r2.error || r3.error || r4.error || r5.error;
    setMsg(err ? { ok: false, texto: "No se pudo guardar: " + err.message } : { ok: true, texto: "¡Disponibilidad guardada!" });
  }

  return (
    <div className="mt-6 space-y-6">
      <Tarjeta titulo="Horarios por día">
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
            const delDia = bloques.map((b, i) => ({ b, i })).filter(({ b }) => b.weekday === wd);
            return (
              <div key={wd} className="flex flex-wrap items-start gap-3 border-b border-slate-100 pb-3 last:border-0">
                <span className="w-24 pt-2 text-sm font-semibold text-slate-800">{DIAS[wd]}</span>
                <div className="flex-1 space-y-2">
                  {delDia.length === 0 && <p className="pt-2 text-sm text-slate-400">No disponible</p>}
                  {delDia.map(({ b, i }) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="time" step={1800} value={b.start_time} onChange={(e) => cambiar(i, "start_time", e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900" />
                      <span className="text-slate-500">a</span>
                      <input type="time" step={1800} value={b.end_time} onChange={(e) => cambiar(i, "end_time", e.target.value)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900" />
                      <button onClick={() => quitar(i)} className="text-sm text-red-600 hover:underline">Quitar</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => agregar(wd)} className="pt-2 text-sm text-blue-700 hover:underline">+ Agregar horario</button>
              </div>
            );
          })}
        </div>
      </Tarjeta>

      <Tarjeta titulo="Límites">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Máximo de sesiones por semana</label>
            <input type="number" min={0} max={50} className={inputCls} value={max} onChange={(e) => setMax(Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Duración típica de tus sesiones</label>
            <select className={inputCls} value={dur} onChange={(e) => setDur(Number(e.target.value))}>
              {[15, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Fechas bloqueadas">
        <p className="mb-2 text-sm text-slate-500">Días en los que no darás mentorías (exámenes, viajes, vacaciones).</p>
        <div className="flex gap-2">
          <input type="date" className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
          <button
            className={btnSecundario}
            onClick={() => {
              if (nuevaFecha && !bloqueadas.includes(nuevaFecha)) setBloqueadas([...bloqueadas, nuevaFecha].sort());
              setNuevaFecha("");
            }}
          >
            Bloquear
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {bloqueadas.map((d) => (
            <span key={d} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-700">
              {d}
              <button onClick={() => setBloqueadas(bloqueadas.filter((x) => x !== d))} className="text-red-600">×</button>
            </span>
          ))}
        </div>
      </Tarjeta>

      {msg && <p className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.texto}</p>}
      <button onClick={guardar} disabled={guardando} className={`${btnPrimario} w-full py-3`}>
        {guardando ? "Guardando…" : "Guardar disponibilidad"}
      </button>
    </div>
  );
}
