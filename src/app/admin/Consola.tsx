"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Estado, Tarjeta, Vacio, btnPrimario, btnSecundario, inputCls } from "@/components/ui";
import { ESTADOS, fecha, horas, insignias } from "@/lib/mentoria";

type Props = {
  usuarios: any[]; sesiones: any[]; reportes: any[]; temas: any[];
  feedback: any[]; perfilTemas: any[]; reglas: any[]; stats: any[]; reconocimientos: any[];
};

const PESTANAS = ["Resumen", "Validar mentores", "Usuarios", "Sesiones", "Reportes", "Temas", "Reglas", "Reconocimientos"] as const;

export default function Consola(p: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof PESTANAS)[number]>("Resumen");
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const nombre = (id: string) => p.usuarios.find((u) => u.id === id)?.full_name || "—";
  const nombreTema = (id: number) => p.temas.find((t) => t.id === id)?.name ?? "—";

  async function hacer(promesa: PromiseLike<{ error: any }>) {
    setError(null);
    const { error } = await promesa;
    if (error) setError(error.message);
    router.refresh();
  }

  const pendientes = p.usuarios.filter((u) => u.is_mentor && u.mentor_status === "pending");
  const reportesAbiertos = p.reportes.filter((r) => r.status !== "closed");

  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-wrap gap-2">
        {PESTANAS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 text-sm ${tab === t ? "bg-blue-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"}`}>
            {t}
            {t === "Validar mentores" && pendientes.length > 0 && ` (${pendientes.length})`}
            {t === "Reportes" && reportesAbiertos.length > 0 && ` (${reportesAbiertos.length})`}
          </button>
        ))}
      </div>
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {tab === "Resumen" && <Resumen {...p} nombreTema={nombreTema} />}

      {tab === "Validar mentores" && (
        <Tarjeta titulo="Mentores por validar">
          {pendientes.length === 0 ? <Vacio>No hay mentores pendientes.</Vacio> : (
            <ul className="divide-y divide-slate-100">
              {pendientes.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="text-sm">
                    <p className="font-semibold text-slate-900">{u.full_name}</p>
                    <p className="text-slate-500">{u.email} · {u.career}</p>
                    <Link href={`/mentores/${u.id}`} className="text-blue-700 underline">Ver perfil</Link>
                  </div>
                  <div className="flex gap-2">
                    <button className={btnPrimario} onClick={() => hacer(supabase.from("profiles").update({ mentor_status: "approved" }).eq("id", u.id))}>Aprobar</button>
                    <button className={btnSecundario} onClick={() => hacer(supabase.from("profiles").update({ mentor_status: "rejected" }).eq("id", u.id))}>Rechazar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      )}

      {tab === "Usuarios" && <Usuarios usuarios={p.usuarios} hacer={hacer} />}

      {tab === "Sesiones" && (
        <Tarjeta titulo={`Sesiones (${p.sesiones.length})`}>
          {p.sesiones.length === 0 ? <Vacio>Aún no hay sesiones.</Vacio> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr><th className="py-2">Fecha</th><th>Estudiante</th><th>Mentor</th><th>Tema</th><th>Min</th><th>Estado</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {p.sesiones.map((s) => (
                    <tr key={s.id}>
                      <td className="py-2"><Link href={`/sesiones/${s.id}`} className="text-blue-700 underline">{fecha(s.starts_at)}</Link></td>
                      <td>{nombre(s.student_id)}</td><td>{nombre(s.mentor_id)}</td>
                      <td>{nombreTema(s.topic_id)}</td><td>{s.duration_min}</td><td><Estado status={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      )}

      {tab === "Reportes" && (
        <Tarjeta titulo="Reportes">
          {p.reportes.length === 0 ? <Vacio>No hay reportes. 🎉</Vacio> : (
            <ul className="divide-y divide-slate-100">
              {p.reportes.map((r) => (
                <li key={r.id} className="space-y-1 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-slate-500">
                      {fecha(r.created_at)} · {nombre(r.reporter_id)} reportó a <strong className="text-slate-900">{r.reported_id ? nombre(r.reported_id) : "—"}</strong>
                      {r.session_id && <> · <Link href={`/sesiones/${r.session_id}`} className="text-blue-700 underline">sesión</Link></>}
                    </p>
                    <select value={r.status} onChange={(e) => hacer(supabase.from("reports").update({ status: e.target.value }).eq("id", r.id))}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-900">
                      <option value="open">Abierto</option><option value="reviewing">En revisión</option><option value="closed">Cerrado</option>
                    </select>
                  </div>
                  <p className="whitespace-pre-wrap text-slate-800">{r.reason}</p>
                  {r.reported_id && (
                    <button className="text-xs text-red-600 underline"
                      onClick={() => hacer(supabase.from("profiles").update({ is_blocked: true }).eq("id", r.reported_id))}>
                      Bloquear a esta persona
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      )}

      {tab === "Temas" && <Temas temas={p.temas} hacer={hacer} />}
      {tab === "Reglas" && <Reglas reglas={p.reglas} hacer={hacer} />}

      {tab === "Reconocimientos" && (
        <div className="space-y-4">
        <DarReconocimiento usuarios={p.usuarios} reconocimientos={p.reconocimientos} hacer={hacer} nombre={nombre} />
        <Tarjeta titulo="Insignias automáticas">
          <p className="mb-3 text-sm text-slate-500">Se otorgan automáticamente según sesiones, horas, personas y temas.</p>
          {p.stats.length === 0 ? <Vacio>Aún no hay sesiones realizadas.</Vacio> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {p.stats.map((s) => (
                <li key={s.mentor_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="text-slate-900">{nombre(s.mentor_id)} <span className="text-slate-500">· {s.sesiones} sesiones · {horas(s.minutos)} h</span></span>
                  <span>{insignias(s).filter((i) => i.logrado).map((i) => i.emoji).join(" ") || "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
        </div>
      )}
    </div>
  );
}

function Resumen({ usuarios, sesiones, feedback, temas, perfilTemas, nombreTema }: Props & { nombreTema: (id: number) => string }) {
  const completadas = sesiones.filter((s) => s.status === "completed");
  const minutos = completadas.reduce((a, s) => a + s.duration_min, 0);
  const prom = feedback.length
    ? (feedback.reduce((a, f) => a + (f.usefulness + f.clarity + f.attitude) / 3, 0) / feedback.length).toFixed(1)
    : "—";

  const demanda = useMemo(() => {
    return temas
      .map((t) => ({
        tema: t.name,
        solicitudes: sesiones.filter((s) => s.topic_id === t.id).length,
        interesados: perfilTemas.filter((x) => x.topic_id === t.id && x.kind === "seek").length,
        mentores: perfilTemas.filter((x) => x.topic_id === t.id && x.kind === "offer").length,
      }))
      .map((d) => ({ ...d, total: d.solicitudes * 2 + d.interesados }))
      .sort((a, b) => b.total - a.total);
  }, [temas, sesiones, perfilTemas]);
  const max = Math.max(1, ...demanda.map((d) => d.total));
  const huecos = demanda.filter((d) => d.total > 0 && d.mentores === 0);

  const kpis: [string, string | number][] = [
    ["Usuarios", usuarios.filter((u) => !u.is_demo).length],
    ["Mentores aprobados", usuarios.filter((u) => u.is_mentor && u.mentor_status === "approved").length],
    ["Solicitudes", sesiones.length],
    ["Sesiones realizadas", completadas.length],
    ["Horas de mentoría", horas(minutos)],
    ["Satisfacción promedio", `${prom} / 5`],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-2xl font-bold text-slate-900">{v}</p>
            <p className="text-xs text-slate-500">{k}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Tarjeta titulo="Temas con mayor demanda">
          <p className="mb-3 text-xs text-slate-500">Solicitudes de sesión (×2) + estudiantes interesados.</p>
          <ul className="space-y-2">
            {demanda.slice(0, 10).map((d) => (
              <li key={d.tema} className="text-sm">
                <div className="flex justify-between text-slate-800">
                  <span>{d.tema}</span>
                  <span className="text-slate-500">{d.solicitudes} sol. · {d.interesados} int. · {d.mentores} mentores</span>
                </div>
                <div className="mt-1 h-2 rounded bg-slate-100">
                  <div className="h-2 rounded bg-blue-600" style={{ width: `${(d.total / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <div className="space-y-4">
          <Tarjeta titulo="Sesiones por estado">
            <ul className="space-y-1 text-sm">
              {Object.entries(ESTADOS).map(([k, v]) => (
                <li key={k} className="flex justify-between"><span className="text-slate-700">{v.texto}</span><strong>{sesiones.filter((s) => s.status === k).length}</strong></li>
              ))}
            </ul>
          </Tarjeta>
          <Tarjeta titulo="Sugerencias de temas nuevos">
            {(() => {
              const existentes = new Set(temas.map((t) => t.name.toLowerCase()));
              const otros: string[] = feedback.map((f) => String(f.topic_covered ?? "").trim()).filter((t) => t && !existentes.has(t.toLowerCase()) && t !== "Otro tema");
              const conteo: Record<string, number> = {};
              for (const t of otros) conteo[t] = (conteo[t] ?? 0) + 1;
              const cuenta = Object.entries(conteo).sort((x, y) => y[1] - x[1]);
              return cuenta.length ? (
                <ul className="list-disc pl-5 text-sm text-slate-700">{cuenta.slice(0, 6).map(([t, n]) => <li key={t}>{t} ({n})</li>)}</ul>
              ) : <Vacio>Aparecerán aquí los temas que los estudiantes digan haber tratado y que no existen como categoría.</Vacio>;
            })()}
          </Tarjeta>
          <Tarjeta titulo="Oportunidades: temas sin mentores">
            {huecos.length === 0 ? <Vacio>Todos los temas con demanda tienen al menos un mentor.</Vacio> : (
              <ul className="list-disc pl-5 text-sm text-slate-700">
                {huecos.map((h) => <li key={h.tema}>{h.tema} ({h.interesados} interesados)</li>)}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate-500">Úsalo para invitar mentores o crear nuevas categorías.</p>
          </Tarjeta>
        </div>
      </div>
      {sesiones.length > 0 && <p className="text-xs text-slate-400">Último tema solicitado: {nombreTema(sesiones[0].topic_id)}</p>}
    </div>
  );
}

function Usuarios({ usuarios, hacer }: { usuarios: any[]; hacer: (p: PromiseLike<{ error: any }>) => void }) {
  const supabase = createClient();
  const router = useRouter();
  const [q, setQ] = useState("");
  const lista = usuarios.filter((u) => `${u.full_name} ${u.email} ${u.career}`.toLowerCase().includes(q.toLowerCase()));
  const hayDemo = usuarios.some((u) => u.is_demo);
  return (
    <Tarjeta titulo={`Usuarios (${usuarios.length})`}
      accion={hayDemo && (
        <button className="text-sm text-red-600 underline" onClick={async () => {
          if (!confirm("¿Borrar todos los perfiles de demostración? No se puede deshacer.")) return;
          await supabase.rpc("admin_delete_demo");
          router.refresh();
        }}>Borrar perfiles demo</button>
      )}>
      <input className={inputCls} placeholder="Buscar por nombre, correo o carrera" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr><th className="py-2">Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {lista.map((u) => (
              <tr key={u.id} className={u.is_blocked ? "opacity-50" : ""}>
                <td className="py-2">{u.full_name || "(sin nombre)"} {u.is_demo && <span className="text-[10px] text-slate-400">DEMO</span>}</td>
                <td className="text-slate-500">{u.email}</td>
                <td>{[u.is_admin && "Admin", u.is_mentor && `Mentor (${u.mentor_status})`, "Estudiante"].filter(Boolean).join(" · ")}</td>
                <td className="space-x-2 whitespace-nowrap">
                  <button className="text-blue-700 underline" onClick={() => hacer(supabase.from("profiles").update({ is_blocked: !u.is_blocked }).eq("id", u.id))}>
                    {u.is_blocked ? "Desbloquear" : "Bloquear"}
                  </button>
                  <button className="text-blue-700 underline" onClick={() => hacer(supabase.from("profiles").update({ is_admin: !u.is_admin }).eq("id", u.id))}>
                    {u.is_admin ? "Quitar admin" : "Hacer admin"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}

function Temas({ temas, hacer }: { temas: any[]; hacer: (p: PromiseLike<{ error: any }>) => void }) {
  const supabase = createClient();
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const categorias = [...new Set(temas.map((t) => t.category))];
  return (
    <Tarjeta titulo="Categorías y temas">
      <div className="flex flex-wrap gap-2">
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" placeholder="Nuevo tema" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" list="categorias" placeholder="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value)} />
        <datalist id="categorias">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
        <button className={btnPrimario} onClick={() => {
          if (!nombre.trim() || !categoria.trim()) return;
          hacer(supabase.from("topics").insert({ name: nombre.trim(), category: categoria.trim() }));
          setNombre("");
        }}>Agregar</button>
      </div>
      {categorias.map((c) => (
        <div key={c} className="mt-4">
          <p className="text-xs font-semibold uppercase text-slate-500">{c}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            {temas.filter((t) => t.category === c).map((t) => (
              <button key={t.id} title={t.is_active ? "Clic para desactivar" : "Clic para activar"}
                onClick={() => hacer(supabase.from("topics").update({ is_active: !t.is_active }).eq("id", t.id))}
                className={`rounded-full px-3 py-1 text-sm ${t.is_active ? "bg-slate-100 text-slate-800" : "bg-white text-slate-400 line-through ring-1 ring-slate-200"}`}>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className="mt-4 text-xs text-slate-500">Clic en un tema para activarlo o desactivarlo.</p>
    </Tarjeta>
  );
}

function Reglas({ reglas, hacer }: { reglas: any[]; hacer: (p: PromiseLike<{ error: any }>) => void }) {
  const supabase = createClient();
  const [nueva, setNueva] = useState("");
  return (
    <Tarjeta titulo="Reglas de la comunidad" accion={<Link href="/reglas" className="text-sm text-blue-700 underline">Ver página pública</Link>}>
      <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-800">
        {reglas.map((r) => (
          <li key={r.id}>
            {r.text}{" "}
            <button className="text-xs text-red-600 underline" onClick={() => hacer(supabase.from("community_rules").delete().eq("id", r.id))}>quitar</button>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex gap-2">
        <input className={inputCls} placeholder="Nueva regla" value={nueva} onChange={(e) => setNueva(e.target.value)} />
        <button className={btnPrimario} onClick={() => {
          if (nueva.trim().length < 5) return;
          hacer(supabase.from("community_rules").insert({ text: nueva.trim(), position: reglas.length + 1 }));
          setNueva("");
        }}>Agregar</button>
      </div>
    </Tarjeta>
  );
}

function DarReconocimiento({ usuarios, reconocimientos, hacer, nombre }: {
  usuarios: any[]; reconocimientos: any[]; hacer: (p: PromiseLike<{ error: any }>) => void; nombre: (id: string) => string;
}) {
  const supabase = createClient();
  const mentores = usuarios.filter((u) => u.is_mentor && u.mentor_status === "approved");
  const [mentor, setMentor] = useState("");
  const [titulo, setTitulo] = useState("");
  const [nota, setNota] = useState("");
  return (
    <Tarjeta titulo="Reconocimientos por contribución a la comunidad">
      <p className="mb-3 text-sm text-slate-500">Se muestran en el perfil y el panel del mentor, y complementan las insignias automáticas.</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <select className={inputCls} value={mentor} onChange={(e) => setMentor(e.target.value)}>
          <option value="">Elige un mentor</option>
          {mentores.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </select>
        <input className={inputCls} placeholder="Ej. Mentor del semestre" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <input className={inputCls} placeholder="Motivo (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} />
        <button className={`${btnPrimario} mt-1`} onClick={async () => {
          if (!mentor || titulo.trim().length < 3) return;
          const { data: { user } } = await supabase.auth.getUser();
          hacer(supabase.from("recognitions").insert({ mentor_id: mentor, title: titulo.trim(), note: nota.trim() || null, created_by: user?.id }));
          setTitulo(""); setNota("");
        }}>Otorgar</button>
      </div>
      {reconocimientos.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100 text-sm">
          {reconocimientos.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-slate-800">🏅 <strong>{r.title}</strong> · {nombre(r.mentor_id)}{r.note ? ` · ${r.note}` : ""}</span>
              <button className="text-xs text-red-600 underline" onClick={() => hacer(supabase.from("recognitions").delete().eq("id", r.id))}>quitar</button>
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}
