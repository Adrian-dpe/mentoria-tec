// Consola de administración (solo administradores).
import { redirect } from "next/navigation";
import Nav from "@/components/Nav";
import { usuarioActual } from "@/lib/datos";
import Consola from "./Consola";

export default async function AdminPage() {
  const { supabase, perfil } = await usuarioActual();
  if (!perfil.is_admin) redirect("/panel");

  const [usuarios, sesiones, reportes, temas, feedback, pt, reglas, stats, recon] = await Promise.all([
    supabase.rpc("admin_users"),
    supabase.from("sessions").select("id, student_id, mentor_id, topic_id, starts_at, duration_min, status, created_at").order("starts_at", { ascending: false }),
    supabase.from("reports").select("*").order("created_at", { ascending: false }),
    supabase.from("topics").select("*").order("category").order("name"),
    supabase.from("feedback").select("usefulness, clarity, attitude, topic_covered"),
    supabase.from("profile_topics").select("topic_id, kind"),
    supabase.from("community_rules").select("*").order("position"),
    supabase.rpc("mentor_stats"),
    supabase.from("recognitions").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Consola de administración</h1>
        <Consola
          usuarios={usuarios.data ?? []}
          sesiones={sesiones.data ?? []}
          reportes={reportes.data ?? []}
          temas={temas.data ?? []}
          feedback={feedback.data ?? []}
          perfilTemas={pt.data ?? []}
          reglas={reglas.data ?? []}
          stats={stats.data ?? []}
          reconocimientos={recon.data ?? []}
        />
      </main>
    </div>
  );
}
