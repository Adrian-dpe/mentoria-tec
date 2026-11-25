"use client";

// Interruptor para mostrar u ocultar el LinkedIn desde el panel del mentor.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VisibilidadLinkedIn({ userId, url, visible }: { userId: string; url: string | null; visible: boolean }) {
  const [v, setV] = useState(visible);
  if (!url) {
    return <p className="text-sm text-slate-500">No has agregado tu LinkedIn. <a href="/perfil" className="text-blue-700 underline">Agrégalo</a>.</p>;
  }
  async function cambiar(nuevo: boolean) {
    setV(nuevo);
    const supabase = createClient();
    const { error } = await supabase.from("profile_links").update({ linkedin_visible: nuevo }).eq("profile_id", userId);
    if (error) setV(!nuevo);
  }
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={v} onChange={(e) => cambiar(e.target.checked)} />
      {v ? "Tu LinkedIn es visible para los estudiantes" : "Tu LinkedIn está oculto"}
    </label>
  );
}
