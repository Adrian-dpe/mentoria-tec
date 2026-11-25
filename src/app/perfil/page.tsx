// Página "Mi perfil": carga los datos actuales y muestra el formulario.
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const [{ data: perfil }, { data: link }, { data: temas }, { data: misTemas }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("profile_links").select("*").eq("profile_id", user.id).single(),
    supabase.from("topics").select("id, name, category").eq("is_active", true).order("id"),
    supabase.from("profile_topics").select("topic_id, kind").eq("profile_id", user.id),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold text-slate-900">Mi perfil</h1>
        <p className="mt-1 text-slate-600">
          Toma menos de 3 minutos. Puedes cambiarlo cuando quieras.
        </p>
        <ProfileForm
          userId={user.id}
          email={user.email ?? ""}
          perfil={perfil}
          link={link}
          temas={temas ?? []}
          misTemas={misTemas ?? []}
        />
      </div>
    </main>
  );
}
