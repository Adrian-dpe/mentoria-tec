// Consultas que usan varias páginas del servidor.
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Stats } from "@/lib/mentoria";

export async function usuarioActual() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: perfil } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!perfil?.full_name || !perfil?.career) redirect("/perfil");
  return { supabase, user, perfil };
}

// Mentores aprobados con sus temas, LinkedIn visible, disponibilidad y estadísticas.
export async function cargarMentores(supabase: Awaited<ReturnType<typeof createClient>>) {
  const [{ data: mentores }, { data: temas }, { data: pt }, { data: links }, { data: disp }, { data: stats }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("is_mentor", true)
        .eq("mentor_status", "approved")
        .eq("is_blocked", false),
      supabase.from("topics").select("id, name, category").eq("is_active", true).order("id"),
      supabase.from("profile_topics").select("profile_id, topic_id, kind"),
      supabase.from("profile_links").select("profile_id, linkedin_url"),
      supabase.from("availability").select("mentor_id, weekday, start_time, end_time"),
      supabase.rpc("mentor_stats"),
    ]);

  const nombreTema = new Map((temas ?? []).map((t) => [t.id, t.name]));
  const statsDe = new Map<string, Stats>((stats ?? []).map((s: any) => [s.mentor_id, s]));

  const lista = (mentores ?? []).map((m) => {
    const ofrece = (pt ?? [])
      .filter((x) => x.profile_id === m.id && x.kind === "offer")
      .map((x) => nombreTema.get(x.topic_id))
      .filter(Boolean) as string[];
    const horarios = (disp ?? []).filter((d) => d.mentor_id === m.id);
    return {
      ...m,
      ofrece,
      linkedin: (links ?? []).find((l) => l.profile_id === m.id)?.linkedin_url ?? null,
      dias: [...new Set(horarios.map((h) => h.weekday))].sort(),
      tieneHorario: horarios.length > 0,
      stats: statsDe.get(m.id) ?? { sesiones: 0, minutos: 0, personas: 0, temas: 0 },
    };
  });

  return { mentores: lista, temas: temas ?? [], nombreTema, pt: pt ?? [] };
}

export type MentorLista = Awaited<ReturnType<typeof cargarMentores>>["mentores"][number];
