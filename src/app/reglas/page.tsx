// Reglas de la comunidad (las administra el admin).
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ReglasPage() {
  const supabase = await createClient();
  const { data: reglas } = await supabase.from("community_rules").select("*").order("position");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
        <Link href="/" className="text-sm font-bold text-slate-900">Mentoría Tec</Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">Código de conducta y reglas de la comunidad</h1>
        {reglas && reglas.length > 0 ? (
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-slate-700">
            {reglas.map((r) => <li key={r.id}>{r.text}</li>)}
          </ol>
        ) : (
          <p className="mt-4 text-slate-600">Inicia sesión para ver las reglas de la comunidad.</p>
        )}
        <p className="mt-6 text-sm text-slate-500">
          Mentoría Tec es un servicio voluntario entre miembros de la comunidad. No es una asesoría profesional
          oficial ni sustituye los canales institucionales.
        </p>
      </div>
    </main>
  );
}
