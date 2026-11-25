"use client";

// Botones de favorito y de reporte.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { btnSecundario, inputCls } from "@/components/ui";

export function Favorito({ mentorId, inicial }: { mentorId: string; inicial: boolean }) {
  const [fav, setFav] = useState(inicial);
  async function toggle() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    if (fav) await supabase.from("favorites").delete().eq("student_id", user.id).eq("mentor_id", mentorId);
    else await supabase.from("favorites").insert({ student_id: user.id, mentor_id: mentorId });
    setFav(!fav);
  }
  return (
    <button onClick={toggle} className="text-sm font-semibold text-amber-600 hover:text-amber-700">
      {fav ? "★ En favoritos" : "☆ Agregar a favoritos"}
    </button>
  );
}

export function Reportar({ reportadoId, sesionId }: { reportadoId: string; sesionId?: number }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar() {
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      reported_id: reportadoId,
      session_id: sesionId ?? null,
      reason: motivo.trim(),
    });
    if (error) return setError("Escribe al menos 5 caracteres.");
    setEnviado(true);
  }

  if (enviado) return <p className="text-sm text-slate-600">Gracias. Un administrador revisará tu reporte.</p>;
  if (!abierto)
    return (
      <button onClick={() => setAbierto(true)} className="text-sm text-slate-500 underline hover:text-red-600">
        Reportar una situación inapropiada
      </button>
    );
  return (
    <div className="rounded-2xl border border-red-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">Reportar</p>
      <p className="text-xs text-slate-500">Solo los administradores verán este reporte.</p>
      <textarea className={inputCls} rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Qué pasó?" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button onClick={enviar} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white">Enviar reporte</button>
        <button onClick={() => setAbierto(false)} className={btnSecundario}>Cancelar</button>
      </div>
    </div>
  );
}
