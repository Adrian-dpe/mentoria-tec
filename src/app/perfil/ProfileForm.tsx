"use client";

// Formulario de registro / edición de perfil.
// Guarda directo en Supabase; las reglas de la base de datos (RLS) garantizan
// que cada quien solo pueda modificar su propio perfil.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { extraerDeLinkedIn } from "@/lib/asistente";
import { CAMPOS_OCULTABLES } from "@/lib/mentoria";

type Tema = { id: number; name: string; category: string };
type MiTema = { topic_id: number; kind: string };
type Props = {
  userId: string;
  email: string;
  perfil: any;
  link: any;
  temas: Tema[];
  misTemas: MiTema[];
};

const IDIOMAS = ["Español", "Inglés", "Francés", "Alemán", "Portugués", "Italiano", "Chino", "Japonés", "Coreano"];

const input =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-700";
const label = "block text-sm font-medium text-slate-700";

export default function ProfileForm({ userId, email, perfil, link, temas, misTemas }: Props) {
  const router = useRouter();
  const [f, setF] = useState({
    full_name: perfil?.full_name ?? "",
    career: perfil?.career ?? "",
    is_alumni: perfil?.is_alumni ?? false,
    semester: perfil?.semester ?? "",
    graduation_year: perfil?.graduation_year ?? "",
    bio: perfil?.bio ?? "",
    is_mentor: perfil?.is_mentor ?? false,
    experience_professional: perfil?.experience_professional ?? "",
    experience_academic: perfil?.experience_academic ?? "",
    goals: perfil?.goals ?? "",
    photo_url: perfil?.photo_url ?? "",
    hidden_fields: (perfil?.hidden_fields ?? []) as string[],
    exchanges: perfil?.exchanges ?? "",
    certifications: (perfil?.certifications ?? []).join(", "),
    industries: (perfil?.industries ?? []).join(", "),
    tools: (perfil?.tools ?? []).join(", "),
    languages: (perfil?.languages ?? ["Español"]) as string[],
    modality: perfil?.modality ?? "virtual",
    session_duration_min: perfil?.session_duration_min ?? 30,
    max_sessions_per_week: perfil?.max_sessions_per_week ?? 3,
    linkedin_url: link?.linkedin_url ?? "",
    linkedin_visible: link?.linkedin_visible ?? true,
    accepted: !!perfil?.accepted_code_of_conduct_at,
  });
  const [busco, setBusco] = useState<Set<number>>(
    new Set(misTemas.filter((t) => t.kind === "seek").map((t) => t.topic_id)),
  );
  const [ofrezco, setOfrezco] = useState<Set<number>>(
    new Set(misTemas.filter((t) => t.kind === "offer").map((t) => t.topic_id)),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textoLinkedIn, setTextoLinkedIn] = useState("");
  const [aviso, setAviso] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  // Sube la foto a la carpeta del usuario en Supabase Storage.
  async function subirFoto(archivo: File | undefined) {
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) return setError("La foto debe pesar menos de 2 MB.");
    setError(null);
    setSubiendo(true);
    const supabase = createClient();
    const ext = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
    const ruta = `${userId}/foto-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(ruta, archivo, { contentType: archivo.type });
    setSubiendo(false);
    if (error) return setError("No se pudo subir la foto: " + error.message);
    set("photo_url", supabase.storage.from("avatars").getPublicUrl(ruta).data.publicUrl);
  }

  // Prellenado asistido: sugiere datos a partir del texto que el usuario pega de su LinkedIn.
  function autocompletar() {
    const r = extraerDeLinkedIn(textoLinkedIn, temas.map((t) => t.name));
    const unir = (actual: string, nuevos: string[]) => [...new Set([...lista(actual), ...nuevos])].join(", ");
    setF((p) => ({
      ...p,
      tools: unir(p.tools, r.herramientas),
      certifications: unir(p.certifications, r.certificaciones),
      industries: unir(p.industries, r.industrias),
      languages: [...new Set([...p.languages, ...r.idiomas])],
    }));
    const ids = temas.filter((t) => r.temas.includes(t.name)).map((t) => t.id);
    if (f.is_mentor) setOfrezco(new Set([...ofrezco, ...ids]));
    const total = r.herramientas.length + r.certificaciones.length + r.industrias.length + r.idiomas.length + (f.is_mentor ? ids.length : 0);
    setAviso(
      total
        ? `Listo: agregamos ${total} sugerencia(s). Revísalas antes de guardar.`
        : "No encontramos datos que sugerir; puedes llenarlos a mano.",
    );
  }

  const set = (campo: string, valor: unknown) => setF((prev) => ({ ...prev, [campo]: valor }));
  const lista = (texto: string) =>
    texto.split(",").map((s) => s.trim()).filter(Boolean);
  const toggle = (conjunto: Set<number>, setConjunto: (s: Set<number>) => void, id: number) => {
    const nuevo = new Set(conjunto);
    if (nuevo.has(id)) nuevo.delete(id);
    else nuevo.add(id);
    setConjunto(nuevo);
  };

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!f.accepted) {
      setError("Debes aceptar el código de conducta para continuar.");
      return;
    }
    if (f.linkedin_url && !/^https:\/\/([a-z]+\.)?linkedin\.com\//i.test(f.linkedin_url)) {
      setError("El link de LinkedIn debe empezar con https://www.linkedin.com/");
      return;
    }
    if (f.is_mentor && ofrezco.size === 0) {
      setError("Como mentor, elige al menos un tema en el que puedas apoyar.");
      return;
    }
    setGuardando(true);
    const supabase = createClient();

    const { error: e1 } = await supabase
      .from("profiles")
      .update({
        full_name: f.full_name.trim(),
        career: f.career.trim(),
        is_alumni: f.is_alumni,
        semester: f.is_alumni || !f.semester ? null : Number(f.semester),
        graduation_year: f.is_alumni && f.graduation_year ? Number(f.graduation_year) : null,
        bio: f.bio.trim() || null,
        is_mentor: f.is_mentor,
        // Al activarse como mentor queda "pendiente" hasta que un admin lo valide.
        ...(f.is_mentor && (!perfil?.mentor_status || ["none", "rejected"].includes(perfil.mentor_status))
          ? { mentor_status: "pending" }
          : {}),
        experience_professional: f.experience_professional.trim() || null,
        experience_academic: f.experience_academic.trim() || null,
        goals: f.goals.trim() || null,
        photo_url: f.photo_url || null,
        hidden_fields: f.hidden_fields,
        exchanges: f.exchanges.trim() || null,
        has_international_experience: f.exchanges.trim().length > 0,
        certifications: lista(f.certifications),
        industries: lista(f.industries),
        tools: lista(f.tools),
        languages: f.languages,
        modality: f.modality,
        session_duration_min: Number(f.session_duration_min),
        max_sessions_per_week: Number(f.max_sessions_per_week),
        accepted_code_of_conduct_at: perfil?.accepted_code_of_conduct_at ?? new Date().toISOString(),
      })
      .eq("id", userId);

    const { error: e2 } = await supabase
      .from("profile_links")
      .update({ linkedin_url: f.linkedin_url.trim() || null, linkedin_visible: f.linkedin_visible })
      .eq("profile_id", userId);

    // Reemplaza los temas: borra los anteriores e inserta los nuevos.
    const { error: e3 } = await supabase.from("profile_topics").delete().eq("profile_id", userId);
    const filas = [
      ...[...busco].map((topic_id) => ({ profile_id: userId, topic_id, kind: "seek" })),
      ...(f.is_mentor ? [...ofrezco].map((topic_id) => ({ profile_id: userId, topic_id, kind: "offer" })) : []),
    ];
    const { error: e4 } = filas.length
      ? await supabase.from("profile_topics").insert(filas)
      : { error: null };

    setGuardando(false);
    const err = e1 || e2 || e3 || e4;
    if (err) {
      setError("No se pudo guardar: " + err.message);
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  const categorias = [...new Set(temas.map((t) => t.category))];
  const Chips = ({ sel, setSel }: { sel: Set<number>; setSel: (s: Set<number>) => void }) => (
    <div className="mt-2 space-y-3">
      {categorias.map((cat) => (
        <div key={cat}>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{cat}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {temas
              .filter((t) => t.category === cat)
              .map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggle(sel, setSel, t.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    sel.has(t.id)
                      ? "border-blue-700 bg-blue-700 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {t.name}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <form onSubmit={guardar} className="mt-8 space-y-8">
      {/* Datos básicos */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">Datos básicos</h2>
        <p className="text-sm text-slate-500">Correo: {email}</p>
        <div className="flex items-center gap-4">
          {f.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={f.photo_url} alt="Tu foto" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-400">👤</div>
          )}
          <div className="text-sm">
            <label className="cursor-pointer font-semibold text-blue-700 underline">
              {subiendo ? "Subiendo…" : f.photo_url ? "Cambiar foto" : "Subir foto (opcional)"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => subirFoto(e.target.files?.[0])} />
            </label>
            {f.photo_url && (
              <button type="button" className="ml-3 text-slate-500 underline" onClick={() => set("photo_url", "")}>Quitar</button>
            )}
            <p className="text-xs text-slate-500">JPG, PNG o WebP, máximo 2 MB.</p>
          </div>
        </div>
        <div>
          <label className={label}>Nombre completo</label>
          <input className={input} required value={f.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div>
          <label className={label}>Carrera</label>
          <input
            className={input}
            required
            placeholder="Ej. Ingeniería en Ciencia de Datos"
            value={f.career}
            onChange={(e) => set("career", e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-slate-700">
            <input type="radio" checked={!f.is_alumni} onChange={() => set("is_alumni", false)} /> Estudiante
          </label>
          <label className="flex items-center gap-2 text-slate-700">
            <input type="radio" checked={f.is_alumni} onChange={() => set("is_alumni", true)} /> Egresado
          </label>
        </div>
        {f.is_alumni ? (
          <div>
            <label className={label}>Año de graduación</label>
            <input type="number" min={1950} max={2100} className={input} value={f.graduation_year} onChange={(e) => set("graduation_year", e.target.value)} />
          </div>
        ) : (
          <div>
            <label className={label}>Semestre</label>
            <input type="number" min={1} max={12} className={input} value={f.semester} onChange={(e) => set("semester", e.target.value)} />
          </div>
        )}
        <div>
          <label className={label}>Link de tu perfil de LinkedIn (opcional)</label>
          <input
            className={input}
            placeholder="https://www.linkedin.com/in/tu-nombre"
            value={f.linkedin_url}
            onChange={(e) => set("linkedin_url", e.target.value)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={f.linkedin_visible} onChange={(e) => set("linkedin_visible", e.target.checked)} />
            Mostrar mi LinkedIn a otros usuarios
          </label>
          <details className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            <summary className="cursor-pointer font-semibold">✨ Autocompletar con mi LinkedIn</summary>
            <p className="mt-2">
              Copia el texto de tu perfil de LinkedIn (Acerca de, Experiencia, Licencias y certificaciones,
              Aptitudes, Idiomas) y pégalo aquí. Sugerimos herramientas, certificaciones, industrias, idiomas
              y temas. El texto no se guarda ni se envía a nadie.
            </p>
            <textarea className={input} rows={4} value={textoLinkedIn} onChange={(e) => setTextoLinkedIn(e.target.value)} placeholder="Pega aquí el texto de tu LinkedIn…" />
            <button type="button" onClick={autocompletar} disabled={!textoLinkedIn.trim()}
              className="mt-2 rounded-lg bg-blue-700 px-3 py-1.5 font-semibold text-white disabled:opacity-60">
              Sugerir datos
            </button>
            {aviso && <p className="mt-2">{aviso}</p>}
          </details>
        </div>
        <div>
          <label className={label}>Sobre mí (opcional)</label>
          <textarea className={input} rows={3} value={f.bio} onChange={(e) => set("bio", e.target.value)} />
        </div>
      </section>

      {/* Temas que busca */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-900">¿En qué te gustaría recibir orientación?</h2>
        <p className="text-sm text-slate-500">Lo usamos para recomendarte mentores.</p>
        <Chips sel={busco} setSel={setBusco} />
        <label className={`${label} mt-4`}>¿Qué te gustaría lograr? (opcional)</label>
        <textarea
          className={input}
          rows={2}
          placeholder="Ej. Conseguir un internship de datos el próximo verano y sacar una certificación de nube."
          value={f.goals}
          onChange={(e) => set("goals", e.target.value)}
        />
      </section>

      {/* Mentor */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <label className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <input type="checkbox" checked={f.is_mentor} onChange={(e) => set("is_mentor", e.target.checked)} />
          Quiero ser mentor
        </label>
        {f.is_mentor && (
          <>
            <p className="text-sm text-slate-500">
              Tu perfil de mentor será visible cuando un administrador lo valide.
            </p>
            <div>
              <p className={label}>Temas en los que puedes apoyar</p>
              <Chips sel={ofrezco} setSel={setOfrezco} />
            </div>
            <div>
              <label className={label}>Experiencia profesional (internships, trabajos, proyectos)</label>
              <textarea className={input} rows={3} value={f.experience_professional} onChange={(e) => set("experience_professional", e.target.value)} />
            </div>
            <div>
              <label className={label}>Experiencia académica (proyectos, concentración, investigación, reconocimientos)</label>
              <textarea className={input} rows={2} value={f.experience_academic} onChange={(e) => set("experience_academic", e.target.value)} />
            </div>
            <div>
              <label className={label}>Intercambios o experiencias internacionales</label>
              <input className={input} placeholder="Ej. Intercambio en TU Munich, 2024" value={f.exchanges} onChange={(e) => set("exchanges", e.target.value)} />
            </div>
            <div>
              <label className={label}>Certificaciones (separadas por coma)</label>
              <input className={input} placeholder="AWS Cloud Practitioner, Google Data Analytics" value={f.certifications} onChange={(e) => set("certifications", e.target.value)} />
            </div>
            <div>
              <label className={label}>Industrias o empresas (separadas por coma)</label>
              <input className={input} placeholder="Consultoría, Banca, Retail" value={f.industries} onChange={(e) => set("industries", e.target.value)} />
            </div>
            <div>
              <label className={label}>Herramientas y tecnologías (separadas por coma)</label>
              <input className={input} placeholder="Python, SQL, Power BI" value={f.tools} onChange={(e) => set("tools", e.target.value)} />
            </div>
            <div>
              <p className={label}>Idiomas</p>
              <div className="mt-1 flex flex-wrap gap-3">
                {IDIOMAS.map((idioma) => (
                  <label key={idioma} className="flex items-center gap-1 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={f.languages.includes(idioma)}
                      onChange={(e) =>
                        set(
                          "languages",
                          e.target.checked ? [...f.languages, idioma] : f.languages.filter((l) => l !== idioma),
                        )
                      }
                    />
                    {idioma}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={label}>Modalidad</label>
                <select className={input} value={f.modality} onChange={(e) => set("modality", e.target.value)}>
                  <option value="virtual">Virtual</option>
                  <option value="presencial">Presencial</option>
                  <option value="ambas">Ambas</option>
                </select>
              </div>
              <div>
                <label className={label}>Duración típica</label>
                <select className={input} value={f.session_duration_min} onChange={(e) => set("session_duration_min", e.target.value)}>
                  {[15, 30, 45, 60, 90].map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Máx. sesiones por semana</label>
                <input type="number" min={0} max={50} className={input} value={f.max_sessions_per_week} onChange={(e) => set("max_sessions_per_week", e.target.value)} />
              </div>
            </div>
            <p className="text-sm text-slate-500">Tus días y horarios disponibles los configurarás en tu panel.</p>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className={label}>¿Qué quieres mostrar en tu perfil público?</p>
              <p className="text-xs text-slate-500">Tu nombre, carrera y temas siempre se muestran. Desmarca lo que prefieras ocultar.</p>
              <div className="mt-2 grid gap-1 sm:grid-cols-2">
                {CAMPOS_OCULTABLES.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!f.hidden_fields.includes(c.id)}
                      onChange={(e) =>
                        set("hidden_fields", e.target.checked ? f.hidden_fields.filter((x) => x !== c.id) : [...f.hidden_fields, c.id])
                      }
                    />
                    {c.texto}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {/* Código de conducta */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <p>
          Mentoría Tec es un servicio <strong>voluntario</strong> entre miembros de la comunidad. No es una
          asesoría profesional oficial ni sustituye los canales institucionales. Me comprometo a tratar a
          todos con respeto, cuidar la información personal de otros y reportar cualquier situación inapropiada.{" "}
          <a href="/reglas" target="_blank" className="text-blue-700 underline">Leer las reglas completas</a>.
        </p>
        <label className="mt-3 flex items-center gap-2 font-medium">
          <input type="checkbox" checked={f.accepted} onChange={(e) => set("accepted", e.target.checked)} />
          Acepto el código de conducta
        </label>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
      >
        {guardando ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}
