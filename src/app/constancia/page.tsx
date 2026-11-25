// Constancia de participación del mentor, lista para imprimir o guardar como PDF.
import Nav from "@/components/Nav";
import { usuarioActual } from "@/lib/datos";
import { horas, insignias } from "@/lib/mentoria";
import Imprimir from "./Imprimir";

export default async function ConstanciaPage() {
  const { supabase, user, perfil } = await usuarioActual();
  const { data: stats } = await supabase.rpc("mentor_stats");
  const s = (stats ?? []).find((x: any) => x.mentor_id === user.id) ?? { sesiones: 0, minutos: 0, personas: 0, temas: 0 };
  const { data: temas } = await supabase
    .from("sessions")
    .select("topics(name)")
    .eq("mentor_id", user.id)
    .eq("status", "completed");
  const nombresTemas = [...new Set((temas ?? []).map((t: any) => t.topics?.name).filter(Boolean))];
  const logradas = insignias(s).filter((i) => i.logrado);
  const hoy = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="print:hidden"><Nav /></div>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-4 flex justify-end print:hidden"><Imprimir /></div>
        <article className="rounded-2xl border-4 border-double border-blue-800 bg-white p-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-800">Mentoría Tec</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Constancia de participación</h1>
          <p className="mt-6 text-slate-700">Se reconoce a</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{perfil.full_name}</p>
          <p className="text-slate-600">{perfil.career}</p>
          <p className="mx-auto mt-6 max-w-xl text-slate-700">
            por su participación voluntaria como mentor, compartiendo su experiencia con la comunidad estudiantil
            con un total de <strong>{s.sesiones} sesiones</strong>, <strong>{horas(s.minutos)} horas</strong> de
            mentoría y <strong>{s.personas} personas apoyadas</strong>.
          </p>
          {nombresTemas.length > 0 && (
            <p className="mt-4 text-sm text-slate-600">Temas: {nombresTemas.join(", ")}</p>
          )}
          {logradas.length > 0 && (
            <p className="mt-2 text-sm text-slate-600">Reconocimientos: {logradas.map((i) => `${i.emoji} ${i.nombre}`).join(" · ")}</p>
          )}
          <p className="mt-10 text-sm text-slate-500">Emitida el {hoy}</p>
          <p className="mt-2 text-xs text-slate-400">
            Constancia generada por la plataforma de mentoría entre pares. No es un documento oficial del Tecnológico de Monterrey.
          </p>
        </article>
      </main>
    </div>
  );
}
