// Panel: la página principal de cada usuario después de entrar.
// Por ahora muestra un resumen; aquí irán solicitudes, sesiones y recomendaciones.
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const ESTADO_MENTOR: Record<string, string> = {
  pending: "En revisión: un administrador validará tu perfil pronto.",
  approved: "Aprobado: tu perfil ya es visible para los estudiantes.",
  rejected: "No aprobado. Revisa tu perfil o contacta a un administrador.",
};

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("full_name, career, is_mentor, mentor_status, is_admin")
    .eq("id", user.id)
    .single();

  if (!perfil?.full_name || !perfil?.career) redirect("/perfil");
  const nombre = perfil.full_name.split(" ")[0];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/panel" className="text-lg font-bold text-slate-900">
            Mentoría Tec
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/perfil" className="text-slate-700 hover:text-blue-700">
              Mi perfil
            </Link>
            <form action="/salir" method="post">
              <button className="text-slate-500 hover:text-slate-900">Salir</button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Hola, {nombre} 👋</h1>
        <p className="mt-1 text-slate-600">{perfil.career}</p>

        {perfil.is_mentor && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            <strong>Perfil de mentor:</strong> {ESTADO_MENTOR[perfil.mentor_status] ?? "Sin solicitar."}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Explorar mentores", "Muy pronto: busca por tema, experiencia o intercambio."],
            ["Mis sesiones", "Muy pronto: tus solicitudes y próximas mentorías."],
            ["Recomendados", "Muy pronto: mentores sugeridos según tus intereses."],
          ].map(([titulo, texto]) => (
            <div key={titulo} className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold text-slate-900">{titulo}</h2>
              <p className="mt-1 text-sm text-slate-500">{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
