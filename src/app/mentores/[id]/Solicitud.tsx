"use client";

// Formulario para solicitar una sesión. Solo muestra horarios libres según la
// disponibilidad del mentor; la base de datos vuelve a validar todo al guardar.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimario, inputCls, labelCls } from "@/components/ui";
import { OFFSET, ZONA } from "@/lib/mentoria";

type Props = {
  mentorId: string;
  studentId: string;
  temas: { id: number; name: string }[];
  disponibilidad: { weekday: number; start_time: string; end_time: string }[];
  bloqueadas: string[];
  ocupados: { starts_at: string; ends_at: string }[];
  duracion: number;
  modalidad: string;
};

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));
const aHora = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Fecha de hoy en hora de México, como "AAAA-MM-DD".
function hoyMx(offsetDias: number) {
  const d = new Date(Date.now() + offsetDias * 86400000);
  return d.toLocaleDateString("en-CA", { timeZone: ZONA });
}

export default function Solicitud(p: Props) {
  const router = useRouter();
  const [temaId, setTemaId] = useState(p.temas[0]?.id ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [duracion, setDuracion] = useState(p.duracion);
  const [modalidad, setModalidad] = useState(p.modalidad === "presencial" ? "presencial" : "virtual");
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<number | null>(null);

  // Próximos 21 días que tienen al menos un horario libre.
  const dias = useMemo(() => {
    const res: { fecha: string; etiqueta: string; horas: string[] }[] = [];
    const limite = Date.now() + 60 * 60 * 1000;
    for (let i = 0; i < 21; i++) {
      const fecha = hoyMx(i);
      if (p.bloqueadas.includes(fecha)) continue;
      const weekday = new Date(`${fecha}T12:00:00${OFFSET}`).getUTCDay();
      const horas: string[] = [];
      for (const b of p.disponibilidad.filter((d) => d.weekday === weekday)) {
        for (let m = aMin(b.start_time); m + duracion <= aMin(b.end_time); m += 30) {
          const inicio = new Date(`${fecha}T${aHora(m)}:00${OFFSET}`).getTime();
          const fin = inicio + duracion * 60000;
          if (inicio < limite) continue;
          const choca = p.ocupados.some(
            (o) => inicio < new Date(o.ends_at).getTime() && fin > new Date(o.starts_at).getTime(),
          );
          if (!choca) horas.push(aHora(m));
        }
      }
      if (horas.length) {
        const etiqueta = new Date(`${fecha}T12:00:00${OFFSET}`).toLocaleDateString("es-MX", {
          timeZone: ZONA, weekday: "short", day: "numeric", month: "short",
        });
        res.push({ fecha, etiqueta, horas: [...new Set(horas)].sort() });
      }
    }
    return res;
  }, [p.bloqueadas, p.disponibilidad, p.ocupados, duracion]);

  const horasDelDia = dias.find((d) => d.fecha === dia)?.horas ?? [];

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!dia || !hora) return setError("Elige un día y un horario.");
    if (descripcion.trim().length < 10) return setError("Cuéntale al mentor un poco más (mínimo 10 caracteres).");
    setEnviando(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("sessions")
      .insert({
        student_id: p.studentId,
        mentor_id: p.mentorId,
        topic_id: temaId || null,
        description: descripcion.trim(),
        starts_at: new Date(`${dia}T${hora}:00${OFFSET}`).toISOString(),
        duration_min: duracion,
        modality: modalidad,
      })
      .select("id")
      .single();
    setEnviando(false);
    if (error) return setError(error.message);
    setListo(data.id);
    router.refresh();
  }

  if (listo) {
    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-5">
        <h2 className="text-lg font-bold text-green-900">¡Solicitud enviada!</h2>
        <p className="mt-1 text-sm text-green-900">
          El mentor la verá en su panel y podrá aceptarla, proponer otro horario o pedirte más información.
        </p>
        <a href={`/sesiones/${listo}`} className="mt-3 inline-block text-sm font-semibold text-green-900 underline">
          Ver mi solicitud →
        </a>
      </section>
    );
  }

  if (p.disponibilidad.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Este mentor todavía no publica horarios. Agrégalo a favoritos y vuelve pronto.
      </section>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-900">Solicitar sesión</h2>
      <div>
        <label className={labelCls}>Tema</label>
        <select className={inputCls} value={temaId} onChange={(e) => setTemaId(Number(e.target.value))}>
          {p.temas.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>¿Qué te gustaría platicar?</label>
        <textarea
          className={inputCls}
          rows={4}
          placeholder="Ej. Quiero aplicar a internships de datos el próximo verano y no sé por dónde empezar."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Duración</label>
          <select className={inputCls} value={duracion} onChange={(e) => { setDuracion(Number(e.target.value)); setHora(""); }}>
            {[15, 30, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Modalidad</label>
          <select className={inputCls} value={modalidad} onChange={(e) => setModalidad(e.target.value)} disabled={p.modalidad !== "ambas"}>
            <option value="virtual">Virtual</option>
            <option value="presencial">Presencial</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelCls}>Día</label>
        {dias.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">No hay horarios libres en las próximas 3 semanas.</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            {dias.map((d) => (
              <button type="button" key={d.fecha} onClick={() => { setDia(d.fecha); setHora(""); }}
                className={`rounded-lg border px-2 py-1 text-sm ${dia === d.fecha ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                {d.etiqueta}
              </button>
            ))}
          </div>
        )}
      </div>
      {dia && (
        <div>
          <label className={labelCls}>Horario (hora del centro de México)</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {horasDelDia.map((h) => (
              <button type="button" key={h} onClick={() => setHora(h)}
                className={`rounded-lg border px-2 py-1 text-sm ${hora === h ? "border-blue-700 bg-blue-700 text-white" : "border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
                {h}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={enviando} className={`${btnPrimario} w-full`}>
        {enviando ? "Enviando…" : "Enviar solicitud"}
      </button>
      <p className="text-xs text-slate-500">
        Mentoría voluntaria entre compañeros. No sustituye la asesoría oficial del Tec.
      </p>
    </form>
  );
}
