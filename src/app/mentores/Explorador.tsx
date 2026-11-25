"use client";

// Catálogo de mentores con búsqueda y filtros.
import { useMemo, useState } from "react";
import Link from "next/link";
import { Chip, inputCls } from "@/components/ui";
import { DIAS_CORTOS, MODALIDAD, horas } from "@/lib/mentoria";

type Props = {
  mentores: any[];
  temas: { id: number; name: string; category: string }[];
  favoritos: string[];
  hayIntereses: boolean;
};

const inicial = {
  texto: "",
  carrera: "",
  categoria: "",
  tema: "",
  tipo: "",
  semestre: "",
  idioma: "",
  modalidad: "",
  dia: "",
  internacional: false,
  certificaciones: false,
  soloFavoritos: false,
  orden: "recomendados",
};

export default function Explorador({ mentores, temas, favoritos, hayIntereses }: Props) {
  const [f, setF] = useState(inicial);
  const set = (k: keyof typeof inicial, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  const carreras = [...new Set(mentores.map((m) => m.career).filter(Boolean))].sort();
  const idiomas = [...new Set(mentores.flatMap((m) => m.languages ?? []))].sort();
  const categorias = [...new Set(temas.map((t) => t.category))];
  const temasVisibles = temas.filter((t) => !f.categoria || t.category === f.categoria);

  const resultado = useMemo(() => {
    const q = f.texto.trim().toLowerCase();
    const lista = mentores.filter((m) => {
      if (q) {
        const texto = [
          m.full_name, m.career, m.bio, m.experience_professional, m.experience_academic, m.exchanges,
          ...(m.ofrece ?? []), ...(m.certifications ?? []), ...(m.industries ?? []), ...(m.tools ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!q.split(/\s+/).every((palabra) => texto.includes(palabra))) return false;
      }
      if (f.carrera && m.career !== f.carrera) return false;
      if (f.categoria) {
        const temasCat = temas.filter((t) => t.category === f.categoria).map((t) => t.name);
        if (!m.ofrece.some((t: string) => temasCat.includes(t))) return false;
      }
      if (f.tema && !m.ofrece.includes(f.tema)) return false;
      if (f.tipo === "egresado" && !m.is_alumni) return false;
      if (f.tipo === "estudiante" && m.is_alumni) return false;
      if (f.semestre && (m.is_alumni || (m.semester ?? 0) < Number(f.semestre))) return false;
      if (f.idioma && !(m.languages ?? []).includes(f.idioma)) return false;
      if (f.modalidad && m.modality !== f.modalidad && m.modality !== "ambas") return false;
      if (f.dia !== "" && !m.dias.includes(Number(f.dia))) return false;
      if (f.internacional && !m.has_international_experience) return false;
      if (f.certificaciones && !(m.certifications ?? []).length) return false;
      if (f.soloFavoritos && !favoritos.includes(m.id)) return false;
      return true;
    });
    return lista.sort((a, b) =>
      f.orden === "sesiones"
        ? b.stats.sesiones - a.stats.sesiones
        : f.orden === "nombre"
          ? a.full_name.localeCompare(b.full_name)
          : b.match.puntaje - a.match.puntaje,
    );
  }, [f, mentores, temas, favoritos]);

  const sel = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900";
  const lbl = "text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Filtros */}
      <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 lg:self-start">
        <div>
          <label className={lbl}>Buscar</label>
          <input
            className={inputCls}
            placeholder="internship, Europa, Python…"
            value={f.texto}
            onChange={(e) => set("texto", e.target.value)}
          />
        </div>
        <div>
          <label className={lbl}>Área</label>
          <select className={sel} value={f.categoria} onChange={(e) => { set("categoria", e.target.value); set("tema", ""); }}>
            <option value="">Todas</option>
            {categorias.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Tema de mentoría</label>
          <select className={sel} value={f.tema} onChange={(e) => set("tema", e.target.value)}>
            <option value="">Todos</option>
            {temasVisibles.map((t) => <option key={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Carrera</label>
          <select className={sel} value={f.carrera} onChange={(e) => set("carrera", e.target.value)}>
            <option value="">Todas</option>
            {carreras.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Tipo</label>
          <select className={sel} value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
            <option value="">Egresados y estudiantes</option>
            <option value="egresado">Egresados</option>
            <option value="estudiante">Estudiantes actuales</option>
          </select>
        </div>
        {f.tipo === "estudiante" && (
          <div>
            <label className={lbl}>Semestre mínimo</label>
            <select className={sel} value={f.semestre} onChange={(e) => set("semestre", e.target.value)}>
              <option value="">Cualquiera</option>
              {[5, 6, 7, 8, 9].map((s) => <option key={s} value={s}>{s}° o más</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={lbl}>Idioma</label>
          <select className={sel} value={f.idioma} onChange={(e) => set("idioma", e.target.value)}>
            <option value="">Cualquiera</option>
            {idiomas.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Modalidad</label>
          <select className={sel} value={f.modalidad} onChange={(e) => set("modalidad", e.target.value)}>
            <option value="">Cualquiera</option>
            <option value="virtual">Virtual</option>
            <option value="presencial">Presencial</option>
          </select>
        </div>
        <div>
          <label className={lbl}>Disponible el día</label>
          <select className={sel} value={f.dia} onChange={(e) => set("dia", e.target.value)}>
            <option value="">Cualquier día</option>
            {DIAS_CORTOS.map((d, i) => <option key={d} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.internacional} onChange={(e) => set("internacional", e.target.checked)} />
            Con experiencia internacional
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.certificaciones} onChange={(e) => set("certificaciones", e.target.checked)} />
            Con certificaciones
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.soloFavoritos} onChange={(e) => set("soloFavoritos", e.target.checked)} />
            Solo mis favoritos
          </label>
        </div>
        <button className="text-sm text-blue-700 underline" onClick={() => setF(inicial)}>
          Limpiar filtros
        </button>
      </aside>

      {/* Resultados */}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-600">
            {resultado.length} mentor{resultado.length === 1 ? "" : "es"}
          </p>
          <select className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900" value={f.orden} onChange={(e) => set("orden", e.target.value)}>
            <option value="recomendados">Recomendados para mí</option>
            <option value="sesiones">Más sesiones</option>
            <option value="nombre">Nombre</option>
          </select>
        </div>
        {!hayIntereses && f.orden === "recomendados" && (
          <p className="mb-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
            Tip: elige en <Link href="/perfil" className="underline">tu perfil</Link> los temas que te interesan
            para recibir mejores recomendaciones.
          </p>
        )}
        {resultado.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">
            No hay mentores con esos filtros. Prueba quitando alguno.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {resultado.map((m) => (
              <TarjetaMentor key={m.id} m={m} favorito={favoritos.includes(m.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TarjetaMentor({ m, favorito }: { m: any; favorito: boolean }) {
  const destacado = m.experience_professional || m.exchanges || m.bio;
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-slate-900">
            {m.full_name} {favorito && <span title="Favorito">★</span>}
          </h3>
          <p className="text-sm text-slate-600">
            {m.career} · {m.is_alumni ? `Egresado ${m.graduation_year ?? ""}` : `${m.semester ?? "?"}° semestre`}
          </p>
        </div>
        {m.is_demo && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">DEMO</span>}
      </div>
      {m.match.razones.length > 0 && (
        <p className="mt-2 text-xs font-medium text-blue-700">✨ Coincide: {m.match.razones.join(", ")}</p>
      )}
      <div className="mt-3 flex flex-wrap gap-1">
        {m.ofrece.slice(0, 4).map((t: string) => <Chip key={t}>{t}</Chip>)}
        {m.ofrece.length > 4 && <Chip>+{m.ofrece.length - 4}</Chip>}
      </div>
      {destacado && <p className="mt-3 line-clamp-2 text-sm text-slate-700">{destacado}</p>}
      <p className="mt-3 text-xs text-slate-500">
        {MODALIDAD[m.modality]} ·{" "}
        {m.dias.length ? `Disponible ${m.dias.map((d: number) => DIAS_CORTOS[d]).join(", ")}` : "Sin horarios aún"}
        {m.stats.sesiones > 0 && ` · ${m.stats.sesiones} sesiones · ${horas(m.stats.minutos)} h`}
      </p>
      <div className="mt-4 flex items-center gap-3 pt-1">
        <Link href={`/mentores/${m.id}`} className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          Ver perfil y solicitar
        </Link>
        {m.linkedin && (
          <a href={m.linkedin} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">
            LinkedIn
          </a>
        )}
      </div>
    </article>
  );
}
