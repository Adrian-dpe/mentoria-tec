// Perfil completo de un mentor + formulario para solicitar sesión.
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { Chip, Tarjeta } from "@/components/ui";
import { usuarioActual } from "@/lib/datos";
import { DIAS, MODALIDAD, horas, insignias } from "@/lib/mentoria";
import Solicitud from "./Solicitud";
import { Favorito, Reportar } from "./Acciones";

export default async function MentorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await usuarioActual();

  const { data: m } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!m || !m.is_mentor || (m.mentor_status !== "approved" && m.id !== user.id)) notFound();

  const [{ data: link }, { data: pt }, { data: disp }, { data: bloqueadas }, { data: ocupados }, { data: fav }, { data: stats }] =
    await Promise.all([
      supabase.from("profile_links").select("linkedin_url").eq("profile_id", id).maybeSingle(),
      supabase.from("profile_topics").select("topic_id, topics(id, name)").eq("profile_id", id).eq("kind", "offer"),
      supabase.from("availability").select("weekday, start_time, end_time").eq("mentor_id", id).order("weekday").order("start_time"),
      supabase.from("blocked_dates").select("date").eq("mentor_id", id),
      supabase.rpc("mentor_busy", { p_mentor: id }),
      supabase.from("favorites").select("mentor_id").eq("student_id", user.id).eq("mentor_id", id).maybeSingle(),
      supabase.rpc("mentor_stats"),
    ]);

  const temas = (pt ?? []).map((x: any) => x.topics).filter(Boolean) as { id: number; name: string }[];
  const s = (stats ?? []).find((x: any) => x.mentor_id === id) ?? { sesiones: 0, minutos: 0, personas: 0, temas: 0 };
  const logradas = insignias(s).filter((i) => i.logrado);
  const esYo = id === user.id;

  const filas: [string, React.ReactNode][] = [
    ["Experiencia profesional", m.experience_professional],
    ["Experiencia académica", m.experience_academic],
    ["Intercambios / internacional", m.exchanges],
    ["Certificaciones", m.certifications?.length ? m.certifications.join(", ") : null],
    ["Herramientas y tecnologías", m.tools?.length ? m.tools.join(", ") : null],
    ["Industrias / empresas", m.industries?.length ? m.industries.join(", ") : null],
    ["Idiomas", m.languages?.length ? m.languages.join(", ") : null],
    ["Modalidad", MODALIDAD[m.modality]],
    ["Duración típica", `${m.session_duration_min} minutos`],
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Link href="/mentores" className="text-sm text-blue-700 underline">← Volver al explorador</Link>
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{m.full_name}</h1>
                <p className="text-slate-600">
                  {m.career} · {m.is_alumni ? `Egresado ${m.graduation_year ?? ""}` : `${m.semester ?? "?"}° semestre`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {!esYo && <Favorito mentorId={id} inicial={!!fav} />}
                {link?.linkedin_url && (
                  <a href={link.linkedin_url} target="_blank" rel="noopener noreferrer"
                     className="rounded-lg border border-blue-700 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                    Ver LinkedIn
                  </a>
                )}
              </div>
            </div>
            {m.bio && <p className="mt-4 text-slate-700">{m.bio}</p>}
            <div className="mt-4 flex flex-wrap gap-1">
              {temas.map((t) => <Chip key={t.id}>{t.name}</Chip>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
              <span><strong>{s.sesiones}</strong> sesiones</span>
              <span><strong>{horas(s.minutos)}</strong> horas de mentoría</span>
              <span><strong>{s.personas}</strong> personas apoyadas</span>
            </div>
            {logradas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {logradas.map((i) => (
                  <span key={i.nombre} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">
                    {i.emoji} {i.nombre}
                  </span>
                ))}
              </div>
            )}
          </section>

          <Tarjeta titulo="Experiencia">
            <dl className="grid gap-3 sm:grid-cols-2">
              {filas.filter(([, v]) => v).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{k}</dt>
                  <dd className="text-sm text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
          </Tarjeta>

          <Tarjeta titulo="Horarios disponibles">
            {(disp ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Este mentor aún no configura sus horarios.</p>
            ) : (
              <ul className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                {(disp ?? []).map((d, i) => (
                  <li key={i}>
                    {DIAS[d.weekday]}: {d.start_time.slice(0, 5)} – {d.end_time.slice(0, 5)}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate-500">Hora del centro de México.</p>
          </Tarjeta>
          {!esYo && <Reportar reportadoId={id} />}
        </div>

        <aside className="lg:self-start">
          {esYo ? (
            <Tarjeta titulo="Este es tu perfil">
              <p className="text-sm text-slate-600">Así te ven los estudiantes.</p>
            </Tarjeta>
          ) : (
            <Solicitud
              mentorId={id}
              studentId={user.id}
              temas={temas}
              disponibilidad={disp ?? []}
              bloqueadas={(bloqueadas ?? []).map((b) => b.date)}
              ocupados={(ocupados ?? []) as any[]}
              duracion={m.session_duration_min}
              modalidad={m.modality}
            />
          )}
        </aside>
      </main>
    </div>
  );
}
