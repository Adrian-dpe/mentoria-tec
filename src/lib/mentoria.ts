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

// ---------- Matching (recomendaciones) ----------
// Puntaje simple y explicable: temas en común, misma carrera, experiencia
// internacional si la busca, y que tenga horarios disponibles.
const TEMAS_INTERNACIONALES = ["Intercambios académicos", "Experiencias internacionales"];

export function puntaje(
  mentor: { career: string | null; ofrece: string[]; has_international_experience: boolean; tieneHorario: boolean },
  yo: { career: string | null; busco: string[] },
) {
  const comunes = mentor.ofrece.filter((t) => yo.busco.includes(t));
  let p = comunes.length * 3;
  const razones: string[] = [];
  if (comunes.length) razones.push(`${comunes.length} tema${comunes.length > 1 ? "s" : ""} en común`);
  if (mentor.career && yo.career && mentor.career.toLowerCase() === yo.career.toLowerCase()) {
    p += 2;
    razones.push("tu misma carrera");
  }
  if (mentor.has_international_experience && yo.busco.some((t) => TEMAS_INTERNACIONALES.includes(t))) {
    p += 2;
    razones.push("experiencia internacional");
  }
  if (mentor.tieneHorario) p += 1;
  return { puntaje: p, razones };
}
