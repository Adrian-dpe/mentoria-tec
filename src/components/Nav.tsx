// Barra de navegación para las páginas con sesión iniciada.
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = user
    ? await supabase.from("profiles").select("is_mentor, is_admin").eq("id", user.id).single()
    : { data: null };

  // Notificaciones: cosas que esperan una acción de este usuario.
  let pendientes = 0;
  let pendientesAdmin = 0;
  if (user) {
    const [{ count: paraMentor }, { count: paraEstudiante }] = await Promise.all([
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("mentor_id", user.id).eq("status", "pending"),
      supabase.from("sessions").select("id", { count: "exact", head: true }).eq("student_id", user.id).in("status", ["info_requested", "reschedule_proposed"]),
    ]);
    pendientes = (paraMentor ?? 0) + (paraEstudiante ?? 0);
    if (perfil?.is_admin) {
      const [{ count: mentores }, { count: reportes }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_mentor", true).eq("mentor_status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      pendientesAdmin = (mentores ?? 0) + (reportes ?? 0);
    }
  }

  const links = [
    { href: "/panel", texto: "Mi panel", badge: pendientes },
    { href: "/mentores", texto: "Explorar mentores" },
    ...(perfil?.is_mentor ? [{ href: "/disponibilidad", texto: "Disponibilidad" }] : []),
    { href: "/perfil", texto: "Mi perfil" },
    ...(perfil?.is_admin ? [{ href: "/admin", texto: "Admin", badge: pendientesAdmin }] : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/panel" className="text-lg font-bold text-slate-900">
          PCT
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-1 text-slate-700 hover:text-blue-700">
              {l.texto}
              {"badge" in l && (l.badge ?? 0) > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white" title="Pendientes de tu atención">
                  {l.badge}
                </span>
              )}
            </Link>
          ))}
          <form action="/salir" method="post">
            <button className="text-slate-500 hover:text-slate-900">Salir</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
