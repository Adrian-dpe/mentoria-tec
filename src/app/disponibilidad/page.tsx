// Disponibilidad del mentor: horarios por día, fechas bloqueadas y límites.
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { usuarioActual } from "@/lib/datos";
import Editor from "./Editor";

export default async function DisponibilidadPage() {
  const { supabase, user, perfil } = await usuarioActual();
  if (!perfil.is_mentor) redirect("/perfil");

  const [{ data: bloques }, { data: bloqueadas }] = await Promise.all([
    supabase.from("availability").select("id, weekday, start_time, end_time").eq("mentor_id", user.id).order("weekday").order("start_time"),
    supabase.from("blocked_dates").select("date").eq("mentor_id", user.id).order("date"),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Mi disponibilidad</h1>
        <p className="mt-1 text-slate-600">
          Los estudiantes solo podrán pedirte sesiones en estos horarios (hora del centro de México).
        </p>
        <Editor
          userId={user.id}
          bloquesIniciales={(bloques ?? []).map((b) => ({ ...b, start_time: b.start_time.slice(0, 5), end_time: b.end_time.slice(0, 5) }))}
          bloqueadasIniciales={(bloqueadas ?? []).map((b) => b.date)}
          maxSemana={perfil.max_sessions_per_week}
          duracion={perfil.session_duration_min}
        />
      </main>
    </div>
  );
}
