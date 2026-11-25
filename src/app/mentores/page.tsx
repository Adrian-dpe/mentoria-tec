// Explorador de mentores: carga los datos en el servidor y el filtrado
// sucede en el navegador para que sea instantáneo.
import Nav from "@/components/Nav";
import { cargarMentores, usuarioActual } from "@/lib/datos";
import { puntaje } from "@/lib/mentoria";
import Explorador from "./Explorador";

export default async function MentoresPage() {
  const { supabase, user, perfil } = await usuarioActual();
  const { mentores, temas, nombreTema, pt } = await cargarMentores(supabase);

  const busco = pt
    .filter((x) => x.profile_id === user.id && x.kind === "seek")
    .map((x) => nombreTema.get(x.topic_id))
    .filter(Boolean) as string[];

  const { data: favs } = await supabase.from("favorites").select("mentor_id").eq("student_id", user.id);

  const conPuntaje = mentores
    .filter((m) => m.id !== user.id)
    .map((m) => ({ ...m, match: puntaje(m, { career: perfil.career, busco }) }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900">Explorar mentores</h1>
        <p className="mt-1 text-slate-600">
          Encuentra a alguien con la experiencia que buscas. Ejemplo: “alguien de mi carrera que haya
          hecho un internship en datos”.
        </p>
        <Explorador
          mentores={conPuntaje}
          temas={temas}
          favoritos={(favs ?? []).map((f) => f.mentor_id)}
          hayIntereses={busco.length > 0}
        />
      </main>
    </div>
  );
}
