// Panel principal: vista de estudiante y, si aplica, vista de mentor.
import Link from "next/link";
import Nav from "@/components/Nav";
import { Chip, Estado, Tarjeta, Vacio } from "@/components/ui";
import { cargarMentores, usuarioActual } from "@/lib/datos";
import { fecha, horas, insignias, puntaje } from "@/lib/mentoria";

const ABIERTAS = ["pending", "info_requested", "reschedule_proposed"];

export default async function PanelPage() {
  const { supabase, user, perfil } = await usuarioActual();

  const [{ data: sesiones }, { data: favs }, { data: feedback }, datos] = await Promise.all([
    supabase
      .from("sessions")
      .select("*, topics(name)")
      .or(`student_id.eq.${user.id},mentor_id.eq.${user.id}`)
      .order("starts_at", { ascending: true }),
    supabase.from("favorites").select("mentor_id").eq("student_id", user.id),
    supabase.from("feedback").select("*, sessions!inner(mentor_id)").eq("sessions.mentor_id", user.id),
    cargarMentores(supabase),
  ]);

  const todas = sesiones ?? [];
  const ids = [...new Set(todas.flatMap((s) => [s.student_id, s.mentor_id]))];
  const { data: personas } = ids.length
    ? await supabase.from("profiles").select("id, full_name").in("id", ids)
    : { data: [] as { id: string; full_name: string }[] };
  const nombre = (id: string) => personas?.find((p) => p.id === id)?.full_name ?? "—";

  const ahora = Date.now();
  const comoEstudiante = todas.filter((s) => s.student_id === user.id);
  const comoMentor = todas.filter((s) => s.mentor_id === user.id);

  const busco = datos.pt
    .filter((x) => x.profile_id === user.id && x.kind === "seek")
    .map((x) => datos.nombreTema.get(x.topic_id))
    .filter(Boolean) as string[];
  const recomendados = datos.mentores
    .filter((m) => m.id !== user.id)
    .map((m) => ({ ...m, match: puntaje(m, { career: perfil.career, busco }) }))
    .sort((a, b) => b.match.puntaje - a.match.puntaje)
    .slice(0, 3);
  const favoritos = datos.mentores.filter((m) => (favs ?? []).some((f) => f.mentor_id === m.id));
  const conectados = datos.mentores.filter(
    (m) => m.linkedin && comoEstudiante.some((s) => s.mentor_id === m.id && ["accepted", "completed"].includes(s.status)),
  );

  const misStats = datos.mentores.find((m) => m.id === user.id)?.stats ?? {
    sesiones: 0, minutos: 0, personas: 0, temas: 0,
  };
  const fb = feedback ?? [];
  const prom = (k: "usefulness" | "clarity" | "attitude") =>
    fb.length ? (fb.reduce((a, f) => a + f[k], 0) / fb.length).toFixed(1) : "—";

  const Lista = ({ items, rol }: { items: typeof todas; rol: "estudiante" | "mentor" }) => (
    <ul className="divide-y divide-slate-100">
      {items.map((s) => (
        <li key={s.id}>
          <Link href={`/sesiones/${s.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2 hover:bg-slate-50">
            <span className="text-sm text-slate-800">
              <strong>{s.topics?.name ?? "Mentoría"}</strong> con {nombre(rol === "estudiante" ? s.mentor_id : s.student_id)}
              <span className="block text-xs text-slate-500">{fecha(s.starts_at)} · {s.duration_min} min</span>
            </span>
            <Estado status={s.status} />
          </Link>
        </li>
      ))}
    </ul>
  );

  const proximasEst = comoEstudiante.filter((s) => s.status === "accepted" && new Date(s.starts_at).getTime() > ahora - 3600000);
  const abiertasEst = comoEstudiante.filter((s) => ABIERTAS.includes(s.status));
  const historialEst = comoEstudiante.filter((s) => !ABIERTAS.includes(s.status) && !proximasEst.includes(s)).reverse();

  const recibidas = comoMentor.filter((s) => ABIERTAS.includes(s.status));
  const proximasMen = comoMentor.filter((s) => s.status === "accepted");
  const historialMen = comoMentor.filter((s) => ["completed", "cancelled", "rejected"].includes(s.status)).reverse();
  const porMarcar = proximasMen.filter((s) => new Date(s.starts_at).getTime() < ahora).length;

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Hola, {perfil.full_name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-slate-600">{perfil.career}</p>
          {busco.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {busco.map((t) => <Chip key={t}>{t}</Chip>)}
              <Link href="/perfil" className="text-xs text-blue-700 underline">editar intereses</Link>
            </div>
          )}
        </div>

        {/* ---------------- MENTOR ---------------- */}
        {perfil.is_mentor && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900">Como mentor</h2>
            {perfil.mentor_status !== "approved" ? (
              <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                {perfil.mentor_status === "rejected"
                  ? "Tu perfil de mentor no fue aprobado. Revisa tu perfil o contacta a un administrador."
                  : "Tu perfil de mentor está en revisión. Mientras tanto, configura tu disponibilidad."}{" "}
                <Link href="/disponibilidad" className="underline">Configurar disponibilidad</Link>
              </p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                ["Sesiones realizadas", misStats.sesiones],
                ["Horas de mentoría", horas(misStats.minutos)],
                ["Personas apoyadas", misStats.personas],
                ["Solicitudes por atender", recibidas.length],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-2xl font-bold text-slate-900">{v}</p>
                  <p className="text-xs text-slate-500">{k}</p>
                </div>
              ))}
            </div>
            {porMarcar > 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Tienes {porMarcar} sesión(es) que ya pasaron: ábrelas y márcalas como realizadas para que cuenten en tus horas.
              </p>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <Tarjeta titulo="Solicitudes recibidas">
                {recibidas.length ? <Lista items={recibidas} rol="mentor" /> : <Vacio>No tienes solicitudes pendientes.</Vacio>}
              </Tarjeta>
              <Tarjeta titulo="Sesiones confirmadas">
                {proximasMen.length ? <Lista items={proximasMen} rol="mentor" /> : <Vacio>Sin sesiones confirmadas.</Vacio>}
              </Tarjeta>
              <Tarjeta titulo="Retroalimentación recibida">
                {fb.length === 0 ? (
                  <Vacio>Aún no recibes retroalimentación.</Vacio>
                ) : (
                  <>
                    <p className="text-sm text-slate-700">
                      Utilidad {prom("usefulness")} · Claridad {prom("clarity")} · Disposición {prom("attitude")}{" "}
                      <span className="text-slate-500">({fb.length})</span>
                    </p>
                    <ul className="mt-2 space-y-1">
                      {fb.filter((f) => f.comment).slice(0, 5).map((f) => (
                        <li key={f.session_id} className="text-sm italic text-slate-600">“{f.comment}”</li>
                      ))}
                    </ul>
                  </>
                )}
              </Tarjeta>
              <Tarjeta
                titulo="Reconocimientos"
                accion={<Link href="/constancia" className="text-sm text-blue-700 underline">Ver constancia</Link>}
              >
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {insignias(misStats).map((i) => (
                    <div key={i.nombre} title={i.meta}
                      className={`rounded-xl border p-2 text-center text-xs ${i.logrado ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 text-slate-400"}`}>
                      <div className={`text-2xl ${i.logrado ? "" : "grayscale"}`}>{i.emoji}</div>
                      {i.nombre}
                      {!i.logrado && <div className="text-[10px]">{i.meta}</div>}
                    </div>
                  ))}
                </div>
              </Tarjeta>
              <Tarjeta titulo="Historial de mentorías">
                {historialMen.length ? <Lista items={historialMen.slice(0, 8)} rol="mentor" /> : <Vacio>Aún no hay historial.</Vacio>}
              </Tarjeta>
              <Tarjeta titulo="Mi perfil de mentor">
                <ul className="space-y-1 text-sm">
                  <li><Link href="/disponibilidad" className="text-blue-700 underline">Disponibilidad y fechas bloqueadas</Link></li>
                  <li><Link href={`/mentores/${user.id}`} className="text-blue-700 underline">Ver mi perfil como lo ven los estudiantes</Link></li>
                  <li><Link href="/perfil" className="text-blue-700 underline">Editar perfil y visibilidad de LinkedIn</Link></li>
                </ul>
              </Tarjeta>
            </div>
          </div>
        )}

        {/* ---------------- ESTUDIANTE ---------------- */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900">{perfil.is_mentor ? "Como estudiante" : "Mis mentorías"}</h2>
          <Tarjeta titulo="Mentores recomendados para ti" accion={<Link href="/mentores" className="text-sm text-blue-700 underline">Ver todos</Link>}>
            {recomendados.length === 0 ? (
              <Vacio>Todavía no hay mentores aprobados.</Vacio>
            ) : (
              <div className="grid gap-3 sm:grid-cols-3">
                {recomendados.map((m) => (
                  <Link key={m.id} href={`/mentores/${m.id}`} className="rounded-xl border border-slate-200 p-3 hover:border-blue-300">
                    <p className="font-semibold text-slate-900">{m.full_name}</p>
                    <p className="text-xs text-slate-500">{m.career}</p>
                    <p className="mt-1 text-xs text-blue-700">
                      {m.match.razones.length ? `✨ ${m.match.razones.join(", ")}` : m.ofrece.slice(0, 2).join(", ")}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </Tarjeta>
          <div className="grid gap-4 lg:grid-cols-2">
            <Tarjeta titulo="Próximas mentorías">
              {proximasEst.length ? <Lista items={proximasEst} rol="estudiante" /> : <Vacio>No tienes sesiones confirmadas. <Link href="/mentores" className="text-blue-700 underline">Busca un mentor</Link>.</Vacio>}
            </Tarjeta>
            <Tarjeta titulo="Solicitudes enviadas">
              {abiertasEst.length ? <Lista items={abiertasEst} rol="estudiante" /> : <Vacio>No tienes solicitudes en espera.</Vacio>}
            </Tarjeta>
            <Tarjeta titulo="Historial de sesiones">
              {historialEst.length ? <Lista items={historialEst.slice(0, 8)} rol="estudiante" /> : <Vacio>Aún no hay historial.</Vacio>}
            </Tarjeta>
            <Tarjeta titulo="Mentores favoritos">
              {favoritos.length ? (
                <ul className="space-y-1 text-sm">
                  {favoritos.map((m) => (
                    <li key={m.id}><Link href={`/mentores/${m.id}`} className="text-blue-700 underline">{m.full_name}</Link> <span className="text-slate-500">· {m.ofrece.slice(0, 2).join(", ")}</span></li>
                  ))}
                </ul>
              ) : <Vacio>Marca mentores con ☆ para tenerlos a la mano.</Vacio>}
            </Tarjeta>
            <Tarjeta titulo="Mis conexiones en LinkedIn">
              {conectados.length ? (
                <ul className="space-y-1 text-sm">
                  {conectados.map((m) => (
                    <li key={m.id}>{m.full_name} · <a href={m.linkedin!} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">LinkedIn</a></li>
                  ))}
                </ul>
              ) : <Vacio>Aquí aparecerán los mentores con quienes tengas sesiones.</Vacio>}
            </Tarjeta>
          </div>
        </div>
      </main>
    </div>
  );
}
