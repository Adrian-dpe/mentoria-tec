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

  const links = [
    { href: "/panel", texto: "Mi panel" },
    { href: "/mentores", texto: "Explorar mentores" },
    ...(perfil?.is_mentor ? [{ href: "/disponibilidad", texto: "Disponibilidad" }] : []),
    { href: "/perfil", texto: "Mi perfil" },
    ...(perfil?.is_admin ? [{ href: "/admin", texto: "Admin" }] : []),
  ];

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-3">
        <Link href="/panel" className="text-lg font-bold text-slate-900">
          Mentoría Tec
        </Link>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="text-slate-700 hover:text-blue-700">
              {l.texto}
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
