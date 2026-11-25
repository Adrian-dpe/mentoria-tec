// Detalle de una sesión, con las acciones según quién la ve y su estado.
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { Estado, Tarjeta } from "@/components/ui";
import { usuarioActual } from "@/lib/datos";
import { MODALIDAD, fecha } from "@/lib/mentoria";
import AccionesSesion from "./AccionesSesion";
import { Reportar } from "@/app/mentores/[id]/Acciones";
import { Chat, Seguimiento } from "./Conversacion";
import { preguntasSugeridas } from "@/lib/asistente";

export default async function SesionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await usuarioActual();

  const { data: s } = await supabase.from("sessions").select("*, topics(name)").eq("id", id).maybeSingle();
  if (!s) notFound();

  const soyMentor = s.mentor_id === user.id;
  const otroId = soyMentor ? s.student_id : s.mentor_id;
  const [{ data: otro }, { data: link }, { data: feedback }, { data: mensajes }] = await Promise.all([
    supabase.from("profiles").select("full_name, career, semester, is_alumni, graduation_year").eq("id", otroId).single(),
    supabase.from("profile_links").select("linkedin_url").eq("profile_id", otroId).maybeSingle(),
    supabase.from("feedback").select("*").eq("session_id", id).maybeSingle(),
    supabase.from("messages").select("id, author_id, body, created_at").eq("session_id", id).order("created_at"),
  ]);
  const tema = s.topics?.name ?? null;
  const preparacion = ["pending", "accepted", "info_requested", "reschedule_proposed"].includes(s.status);

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Link href="/panel" className="text-sm text-blue-700 underline">← Volver a mi panel</Link>
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{s.topics?.name ?? "Sesión de mentoría"}</h1>
            <Estado status={s.status} />
          </div>
          <p className="mt-1 text-slate-600">
            {soyMentor ? "Estudiante" : "Mentor"}:{" "}
            {soyMentor ? (
              <strong>{otro?.full_name}</strong>
            ) : (
              <Link href={`/mentores/${otroId}`} className="font-semibold text-blue-700 underline">{otro?.full_name}</Link>
            )}{" "}
            · {otro?.career}
            {link?.linkedin_url && s.status !== "rejected" && (
              <>
                {" · "}
                <a href={link.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">LinkedIn</a>
              </>
            )}
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Fecha y hora</dt>
              <dd className="text-slate-800">{fecha(s.starts_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Duración</dt>
              <dd className="text-slate-800">{s.duration_min} min</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Modalidad</dt>
              <dd className="text-slate-800">{MODALIDAD[s.modality]}</dd>
            </div>
          </dl>
          {s.meeting_link && s.status === "accepted" && (
            <p className="mt-4 text-sm">
              <span className="font-semibold text-slate-800">Enlace / lugar: </span>
              {/^https?:\/\//.test(s.meeting_link) ? (
                <a href={s.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{s.meeting_link}</a>
              ) : (
                <span className="text-slate-800">{s.meeting_link}</span>
              )}
            </p>
          )}
        </section>

        <Tarjeta titulo="Conversación">
          <div className="space-y-3 text-sm">
            <Mensaje autor="Estudiante" texto={s.description} />
            {s.mentor_message && <Mensaje autor="Mentor" texto={s.mentor_message} />}
            {s.student_reply && <Mensaje autor="Estudiante" texto={s.student_reply} />}
            {s.status === "reschedule_proposed" && s.proposed_starts_at && (
              <p className="rounded-lg bg-blue-50 p-3 text-blue-900">
                El mentor propone cambiar a: <strong>{fecha(s.proposed_starts_at)}</strong>
              </p>
            )}
          </div>
        </Tarjeta>

        {preparacion && (
          <Tarjeta titulo={soyMentor ? "Preguntas que podría traer el estudiante" : "Prepara tu sesión"}>
            <p className="text-sm text-slate-500">Preguntas sugeridas para {tema ?? "esta mentoría"}:</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
              {preguntasSugeridas(tema).map((q) => <li key={q}>{q}</li>)}
            </ul>
          </Tarjeta>
        )}

        <Chat
          sesionId={s.id}
          yo={user.id}
          nombres={{ [otroId]: otro?.full_name ?? "—" }}
          iniciales={mensajes ?? []}
          abierta={!["rejected", "cancelled"].includes(s.status)}
        />

        {s.status === "completed" && (
          <Seguimiento sesionId={s.id} soyMentor={soyMentor} actual={s.followup} tema={tema} />
        )}

        <AccionesSesion
          sesion={s}
          soyMentor={soyMentor}
          nombreOtro={otro?.full_name ?? ""}
          tieneFeedback={!!feedback}
        />

        {feedback && (
          <Tarjeta titulo="Retroalimentación">
            <p className="text-sm text-slate-700">
              Utilidad {feedback.usefulness}/5 · Claridad {feedback.clarity}/5 · Disposición {feedback.attitude}/5
            </p>
            {feedback.topic_covered && <p className="mt-1 text-sm text-slate-600">Tema abordado: {feedback.topic_covered}</p>}
            {feedback.comment && <p className="mt-2 text-sm italic text-slate-700">“{feedback.comment}”</p>}
          </Tarjeta>
        )}

        <Reportar reportadoId={otroId} sesionId={s.id} />
      </main>
    </div>
  );
}

function Mensaje({ autor, texto }: { autor: string; texto: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase text-slate-500">{autor}</p>
      <p className="whitespace-pre-wrap text-slate-800">{texto}</p>
    </div>
  );
}
