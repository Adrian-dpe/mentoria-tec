"use client";

// Mensajería interna de una sesión: solo la ven el estudiante, el mentor y el admin.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Tarjeta, btnPrimario, inputCls } from "@/components/ui";
import { fecha } from "@/lib/mentoria";
import { siguientesPasosSugeridos } from "@/lib/asistente";

type Mensaje = { id: number; author_id: string; body: string; created_at: string };

export function Chat({ sesionId, yo, nombres, iniciales, abierta }: {
  sesionId: number; yo: string; nombres: Record<string, string>; iniciales: Mensaje[]; abierta: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({ session_id: sesionId, author_id: yo, body: texto.trim() });
    setEnviando(false);
    if (error) return setError("No se pudo enviar el mensaje.");
    setTexto("");
    router.refresh();
  }

  return (
    <Tarjeta titulo="Mensajes">
      {iniciales.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay mensajes. Úsalos para preguntas previas o seguimiento.</p>
      ) : (
        <ul className="space-y-2">
          {iniciales.map((m) => (
            <li key={m.id} className={`rounded-lg p-3 text-sm ${m.author_id === yo ? "ml-8 bg-blue-50" : "mr-8 bg-slate-50"}`}>
              <p className="text-xs text-slate-500">{m.author_id === yo ? "Tú" : nombres[m.author_id] ?? "—"} · {fecha(m.created_at)}</p>
              <p className="whitespace-pre-wrap text-slate-800">{m.body}</p>
            </li>
          ))}
        </ul>
      )}
      {abierta ? (
        <form onSubmit={enviar} className="mt-3 flex gap-2">
          <input className={inputCls} placeholder="Escribe un mensaje…" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={2000} />
          <button disabled={enviando || !texto.trim()} className={`${btnPrimario} mt-1`}>Enviar</button>
        </form>
      ) : (
        <p className="mt-3 text-xs text-slate-500">La conversación está cerrada porque la sesión fue rechazada o cancelada.</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-slate-400">Mantén la conversación enfocada en la mentoría. Recarga la página para ver mensajes nuevos.</p>
    </Tarjeta>
  );
}

// Seguimiento posterior: el mentor deja siguientes pasos; el estudiante los ve.
export function Seguimiento({ sesionId, soyMentor, actual, tema }: {
  sesionId: number; soyMentor: boolean; actual: string | null; tema: string | null;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState(actual ?? "");
  const [guardado, setGuardado] = useState(false);
  const sugeridos = siguientesPasosSugeridos(tema);

  if (!soyMentor) {
    return (
      <Tarjeta titulo="Siguientes pasos recomendados">
        {actual ? (
          <p className="whitespace-pre-wrap text-sm text-slate-800">{actual}</p>
        ) : (
          <>
            <p className="text-sm text-slate-500">Tu mentor aún no deja recomendaciones. Mientras tanto:</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">{sugeridos.map((s) => <li key={s}>{s}</li>)}</ul>
          </>
        )}
      </Tarjeta>
    );
  }

  async function guardar() {
    const supabase = createClient();
    const { error } = await supabase.from("sessions").update({ followup: texto.trim() || null }).eq("id", sesionId);
    if (!error) {
      setGuardado(true);
      router.refresh();
    }
  }

  return (
    <Tarjeta titulo="Seguimiento para el estudiante">
      <p className="text-sm text-slate-500">Deja los siguientes pasos que le recomiendas. Ideas:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {sugeridos.map((s) => (
          <button key={s} type="button" onClick={() => setTexto((t) => (t ? `${t}\n- ${s}` : `- ${s}`))}
            className="rounded-full border border-slate-300 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-50">
            + {s}
          </button>
        ))}
      </div>
      <textarea className={inputCls} rows={4} value={texto} onChange={(e) => { setTexto(e.target.value); setGuardado(false); }} />
      <button onClick={guardar} className={`${btnPrimario} mt-2`}>{guardado ? "Guardado ✓" : "Guardar seguimiento"}</button>
    </Tarjeta>
  );
}
