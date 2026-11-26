"use client";

// Botones de acción de una sesión. Las reglas finales las aplica la base de datos.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Tarjeta, btnPrimario, btnSecundario, inputCls, labelCls } from "@/components/ui";
import { OFFSET } from "@/lib/mentoria";

type Props = { sesion: any; soyMentor: boolean; nombreOtro: string; tieneFeedback: boolean };

const ABIERTAS = ["pending", "info_requested", "reschedule_proposed"];

export default function AccionesSesion({ sesion: s, soyMentor, nombreOtro, tieneFeedback }: Props) {
  const router = useRouter();
  const [modo, setModo] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState(s.meeting_link ?? "");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const yaPaso = new Date(s.starts_at).getTime() <= Date.now();

  async function actualizar(cambios: Record<string, unknown>) {
    setError(null);
    setOcupado(true);
    const supabase = createClient();
    const { error } = await supabase.from("sessions").update(cambios).eq("id", s.id);
    setOcupado(false);
    if (error) return setError(error.message);
    setModo(null);
    setTexto("");
    router.refresh();
  }

  function descargarCalendario() {
    const f = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const inicio = new Date(s.starts_at);
    const fin = new Date(inicio.getTime() + s.duration_min * 60000);
    const ics = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PCT//ES", "BEGIN:VEVENT",
      `UID:mentoria-${s.id}@mentoria-tec`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(inicio)}`, `DTEND:${f(fin)}`,
      `SUMMARY:Mentoría con ${nombreOtro}`,
      `DESCRIPTION:${(s.meeting_link ? `Enlace: ${s.meeting_link}\\n` : "") + "PCT · Plataforma de Conexión de Talento"}`,
      ...(s.meeting_link ? [`LOCATION:${s.meeting_link}`] : []),
      "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mentoria-${s.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const botones: { id: string; texto: string; primario?: boolean; directo?: () => void }[] = [];
  if (soyMentor && ABIERTAS.includes(s.status)) {
    botones.push({ id: "aceptar", texto: "Aceptar", primario: true });
    botones.push({ id: "proponer", texto: "Proponer otro horario" });
    botones.push({ id: "info", texto: "Pedir más información" });
    botones.push({ id: "rechazar", texto: "Rechazar" });
  }
  if (soyMentor && s.status === "accepted" && !yaPaso) botones.push({ id: "proponer", texto: "Reprogramar" });
  if (soyMentor && s.status === "accepted") botones.push({ id: "link", texto: "Editar enlace / lugar" });
  if (!soyMentor && s.status === "reschedule_proposed")
    botones.push({ id: "aceptarNuevo", texto: "Aceptar nuevo horario", primario: true,
      directo: () => actualizar({ status: "accepted" }) });
  if (!soyMentor && s.status === "info_requested") botones.push({ id: "responder", texto: "Responder al mentor", primario: true });
  if (s.status === "accepted" && yaPaso)
    botones.push({ id: "realizada", texto: "Marcar como realizada", primario: true,
      directo: () => actualizar({ status: "completed" }) });
  if (s.status === "accepted") botones.push({ id: "ics", texto: "Agregar a mi calendario", directo: descargarCalendario });
  if (["pending", "accepted", "info_requested", "reschedule_proposed"].includes(s.status))
    botones.push({ id: "cancelar", texto: "Cancelar sesión" });

  const mostrarFeedback = !soyMentor && s.status === "completed" && !tieneFeedback;
  if (botones.length === 0 && !mostrarFeedback) return null;

  return (
    <>
      {botones.length > 0 && (
        <Tarjeta titulo="Acciones">
          <div className="flex flex-wrap gap-2">
            {botones.map((b) => (
              <button key={b.id} disabled={ocupado}
                onClick={() => (b.directo ? b.directo() : setModo(modo === b.id ? null : b.id))}
                className={b.primario ? btnPrimario : btnSecundario}>
                {b.texto}
              </button>
            ))}
          </div>

          {modo === "aceptar" && (
            <Formulario onEnviar={() => actualizar({ status: "accepted", meeting_link: link.trim() || null, mentor_message: texto.trim() || s.mentor_message })} ocupado={ocupado} boton="Confirmar sesión">
              <label className={labelCls}>Enlace de Teams/Zoom o lugar de reunión</label>
              <input className={inputCls} placeholder="https://teams.microsoft.com/… o Biblioteca, piso 2" value={link} onChange={(e) => setLink(e.target.value)} />
              <label className={`${labelCls} mt-3`}>Mensaje para el estudiante (opcional)</label>
              <textarea className={inputCls} rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} />
            </Formulario>
          )}
          {modo === "link" && (
            <Formulario onEnviar={() => actualizar({ meeting_link: link.trim() || null })} ocupado={ocupado} boton="Guardar">
              <label className={labelCls}>Enlace o lugar</label>
              <input className={inputCls} value={link} onChange={(e) => setLink(e.target.value)} />
            </Formulario>
          )}
          {modo === "proponer" && (
            <Formulario
              onEnviar={() =>
                nuevaFecha
                  ? actualizar({ status: "reschedule_proposed", proposed_starts_at: new Date(`${nuevaFecha}:00${OFFSET}`).toISOString(), mentor_message: texto.trim() || s.mentor_message })
                  : setError("Elige la nueva fecha y hora.")
              }
              ocupado={ocupado} boton="Enviar propuesta">
              <label className={labelCls}>Nueva fecha y hora (centro de México)</label>
              <input type="datetime-local" className={inputCls} value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} />
              <label className={`${labelCls} mt-3`}>Mensaje (opcional)</label>
              <textarea className={inputCls} rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} />
            </Formulario>
          )}
          {modo === "info" && (
            <Formulario onEnviar={() => (texto.trim() ? actualizar({ status: "info_requested", mentor_message: texto.trim() }) : setError("Escribe tu pregunta."))} ocupado={ocupado} boton="Enviar pregunta">
              <label className={labelCls}>¿Qué necesitas saber?</label>
              <textarea className={inputCls} rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} />
            </Formulario>
          )}
          {modo === "rechazar" && (
            <Formulario onEnviar={() => actualizar({ status: "rejected", mentor_message: texto.trim() || null })} ocupado={ocupado} boton="Rechazar solicitud" peligro>
              <label className={labelCls}>Mensaje amable para el estudiante (opcional)</label>
              <textarea className={inputCls} rows={2} placeholder="Ej. Esa semana no puedo, pero te recomiendo hablar con…" value={texto} onChange={(e) => setTexto(e.target.value)} />
            </Formulario>
          )}
          {modo === "responder" && (
            <Formulario onEnviar={() => (texto.trim() ? actualizar({ status: "pending", student_reply: texto.trim() }) : setError("Escribe tu respuesta."))} ocupado={ocupado} boton="Enviar respuesta">
              <label className={labelCls}>Tu respuesta</label>
              <textarea className={inputCls} rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} />
            </Formulario>
          )}
          {modo === "cancelar" && (
            <Formulario onEnviar={() => actualizar({ status: "cancelled" })} ocupado={ocupado} boton="Sí, cancelar sesión" peligro>
              <p className="text-sm text-slate-700">¿Seguro que quieres cancelar? La otra persona lo verá en su panel.</p>
            </Formulario>
          )}
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </Tarjeta>
      )}
      {mostrarFeedback && <Feedback sesionId={s.id} tema={s.topics?.name ?? null} />}
    </>
  );
}

function Formulario({ children, onEnviar, ocupado, boton, peligro }: {
  children: React.ReactNode; onEnviar: () => void; ocupado: boolean; boton: string; peligro?: boolean;
}) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {children}
      <button onClick={onEnviar} disabled={ocupado}
        className={`mt-3 ${peligro ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" : btnPrimario}`}>
        {ocupado ? "Guardando…" : boton}
      </button>
    </div>
  );
}

function Feedback({ sesionId, tema }: { sesionId: number; tema: string | null }) {
  const router = useRouter();
  const [v, setV] = useState({ usefulness: 0, clarity: 0, attitude: 0, comment: "" });
  const [temaOk, setTemaOk] = useState(true);
  const [otroTema, setOtroTema] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    if (!v.usefulness || !v.clarity || !v.attitude) return setError("Califica los tres aspectos.");
    const supabase = createClient();
    const topic_covered = temaOk ? tema ?? "El tema solicitado" : otroTema.trim() || "Otro tema";
    const { error } = await supabase.from("feedback").insert({ session_id: sesionId, ...v, topic_covered, comment: v.comment.trim() || null });
    if (error) return setError(error.message);
    router.refresh();
  }

  const Estrellas = ({ campo, etiqueta }: { campo: "usefulness" | "clarity" | "attitude"; etiqueta: string }) => (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-slate-700">{etiqueta}</span>
      <div>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setV({ ...v, [campo]: n })}
            className={`text-2xl ${n <= v[campo] ? "text-amber-500" : "text-slate-300"}`} aria-label={`${n} de 5`}>
            ★
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Tarjeta titulo="¿Cómo te fue?">
      <p className="mb-3 text-sm text-slate-500">
        Tu opinión ayuda a mejorar la experiencia y a reconocer a los mentores. No es un ranking.
      </p>
      <div className="space-y-2">
        <Estrellas campo="usefulness" etiqueta="Utilidad de la sesión" />
        <Estrellas campo="clarity" etiqueta="Claridad de las recomendaciones" />
        <Estrellas campo="attitude" etiqueta="Disposición del mentor" />
      </div>
      <div className="mt-3 text-sm text-slate-700">
        <p className="font-medium">Tema abordado</p>
        <label className="mt-1 flex items-center gap-2">
          <input type="radio" checked={temaOk} onChange={() => setTemaOk(true)} /> Hablamos de {tema ?? "el tema que pedí"}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={!temaOk} onChange={() => setTemaOk(false)} /> Hablamos de otro tema
        </label>
        {!temaOk && <input className={inputCls} placeholder="¿De qué tema?" value={otroTema} onChange={(e) => setOtroTema(e.target.value)} />}
      </div>
      <label className={`${labelCls} mt-3`}>Comentario (opcional)</label>
      <textarea className={inputCls} rows={2} value={v.comment} onChange={(e) => setV({ ...v, comment: e.target.value })} />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button onClick={enviar} className={`${btnPrimario} mt-3`}>Enviar retroalimentación</button>
    </Tarjeta>
  );
}
