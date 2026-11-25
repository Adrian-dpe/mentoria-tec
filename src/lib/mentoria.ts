// Textos, colores y cálculos compartidos por varias páginas.

export const ESTADOS: Record<string, { texto: string; color: string }> = {
  pending: { texto: "Pendiente", color: "bg-amber-100 text-amber-800" },
  accepted: { texto: "Confirmada", color: "bg-green-100 text-green-800" },
  rejected: { texto: "Rechazada", color: "bg-slate-200 text-slate-700" },
  reschedule_proposed: { texto: "Nuevo horario propuesto", color: "bg-blue-100 text-blue-800" },
  info_requested: { texto: "Info solicitada", color: "bg-purple-100 text-purple-800" },
  cancelled: { texto: "Cancelada", color: "bg-slate-200 text-slate-700" },
  completed: { texto: "Realizada", color: "bg-emerald-100 text-emerald-800" },
};

export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const MODALIDAD: Record<string, string> = {
  virtual: "Virtual",
  presencial: "Presencial",
  ambas: "Virtual o presencial",
};

// Las horas de disponibilidad se guardan en hora del centro de México (UTC-6, sin horario de verano).
export const ZONA = "America/Monterrey";
export const OFFSET = "-06:00";

export function fecha(iso: string, conHora = true) {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function horas(minutos: number) {
  const h = minutos / 60;
  return Number.isInteger(h) ? `${h}` : h.toFixed(1);
}

// ---------- Reconocimientos ----------
export type Stats = { sesiones: number; minutos: number; personas: number; temas: number };

export function insignias(s: Stats) {
  return [
    { nombre: "Primera mentoría", emoji: "🌱", logrado: s.sesiones >= 1, meta: "1 sesión realizada" },
    { nombre: "Mentor constante", emoji: "🔥", logrado: s.sesiones >= 5, meta: "5 sesiones realizadas" },
    { nombre: "10 horas de impacto", emoji: "⏱️", logrado: s.minutos >= 600, meta: "10 horas de mentoría" },
    { nombre: "Red de apoyo", emoji: "🤝", logrado: s.personas >= 5, meta: "5 personas apoyadas" },
    { nombre: "Multitemático", emoji: "🧭", logrado: s.temas >= 3, meta: "3 temas distintos" },
    { nombre: "Mentor del año", emoji: "🏆", logrado: s.sesiones >= 20, meta: "20 sesiones realizadas" },
  ];
}

// ---------- Visibilidad del perfil ----------
// Campos que cada persona puede ocultar de su perfil público.
export const CAMPOS_OCULTABLES = [
  { id: "photo", texto: "Fotografía" },
  { id: "semester", texto: "Semestre o generación" },
  { id: "bio", texto: "Descripción personal" },
  { id: "experience_academic", texto: "Experiencia académica" },
  { id: "experience_professional", texto: "Experiencia profesional" },
  { id: "exchanges", texto: "Intercambios" },
  { id: "certifications", texto: "Certificaciones" },
  { id: "tools", texto: "Herramientas y tecnologías" },
  { id: "industries", texto: "Industrias o empresas" },
  { id: "languages", texto: "Idiomas" },
];

// Devuelve el perfil sin los campos que su dueño decidió ocultar.
export function perfilPublico<T extends Record<string, any>>(p: T): T {
  const oculto = new Set<string>(p.hidden_fields ?? []);
  const q: Record<string, any> = { ...p };
  if (oculto.has("photo")) q.photo_url = null;
  if (oculto.has("semester")) { q.semester = null; q.graduation_year = null; }
  if (oculto.has("bio")) q.bio = null;
  if (oculto.has("experience_academic")) q.experience_academic = null;
  if (oculto.has("experience_professional")) q.experience_professional = null;
  if (oculto.has("exchanges")) q.exchanges = null;
  if (oculto.has("certifications")) q.certifications = [];
  if (oculto.has("tools")) q.tools = [];
  if (oculto.has("industries")) q.industries = [];
  if (oculto.has("languages")) q.languages = [];
  return q as T;
}

// ---------- Matching (recomendaciones) ----------
// Puntaje simple y explicable: temas en común, misma carrera, semestre más
// avanzado, experiencia internacional, certificaciones o experiencia profesional
// según lo que busca, palabras de sus objetivos y horarios disponibles.
const TEMAS_INTERNACIONALES = ["Intercambios académicos", "Experiencias internacionales"];
const TEMAS_PROFESIONALES = ["Internships", "Prácticas profesionales", "Empleabilidad", "Entrevistas"];
const VACIAS = new Set(["para", "como", "quiero", "sobre", "tener", "hacer", "algo", "este", "esta", "entre", "desde", "pero", "porque", "también", "mucho", "mejor", "poder", "saber", "conseguir", "lograr", "próximo", "verano"]);

export function puntaje(
  mentor: {
    career: string | null; ofrece: string[]; has_international_experience: boolean; tieneHorario: boolean;
    is_alumni?: boolean; semester?: number | null; certifications?: string[]; experience_professional?: string | null;
    bio?: string | null; experience_academic?: string | null; exchanges?: string | null; tools?: string[]; industries?: string[];
  },
  yo: { career: string | null; busco: string[]; semester?: number | null; goals?: string | null },
) {
  const comunes = mentor.ofrece.filter((t) => yo.busco.includes(t));
  let p = comunes.length * 3;
  const razones: string[] = [];
  if (comunes.length) razones.push(`${comunes.length} tema${comunes.length > 1 ? "s" : ""} en común`);
  if (mentor.career && yo.career && mentor.career.toLowerCase() === yo.career.toLowerCase()) {
    p += 2;
    razones.push("tu misma carrera");
  }
  if (yo.semester && (mentor.is_alumni || (mentor.semester ?? 0) > yo.semester)) p += 1;
  if (mentor.has_international_experience && yo.busco.some((t) => TEMAS_INTERNACIONALES.includes(t))) {
    p += 2;
    razones.push("experiencia internacional");
  }
  if ((mentor.certifications ?? []).length && yo.busco.includes("Certificaciones profesionales")) {
    p += 2;
    razones.push("tiene certificaciones");
  }
  if (mentor.experience_professional && yo.busco.some((t) => TEMAS_PROFESIONALES.includes(t))) {
    p += 2;
    razones.push("experiencia profesional");
  }
  if (yo.goals) {
    const texto = [mentor.bio, mentor.experience_professional, mentor.experience_academic, mentor.exchanges,
      ...(mentor.tools ?? []), ...(mentor.industries ?? []), ...(mentor.certifications ?? [])].join(" ").toLowerCase();
    const palabras = [...new Set(yo.goals.toLowerCase().match(/[a-záéíóúñü+#]{4,}/g) ?? [])].filter((w) => !VACIAS.has(w));
    const hits = palabras.filter((w) => texto.includes(w)).length;
    if (hits) {
      p += Math.min(hits, 3);
      razones.push("afín a tus objetivos");
    }
  }
  if (mentor.tieneHorario) p += 1;
  return { puntaje: p, razones };
}
