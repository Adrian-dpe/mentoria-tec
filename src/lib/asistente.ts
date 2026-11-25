// Asistente de mentoría basado en reglas (sin costo y sin enviar datos a terceros).
// Sugiere preguntas para preparar una sesión, siguientes pasos y extrae datos
// del texto que el usuario pega de su LinkedIn para prellenar su perfil.

const PREGUNTAS: Record<string, string[]> = {
  "Datos y analítica": ["¿Qué herramientas debería aprender primero (SQL, Python, Power BI)?", "¿Qué proyecto puedo hacer para mi portafolio?", "¿Cómo es un día de trabajo como analista de datos?"],
  "Inteligencia Artificial": ["¿Por dónde empiezo a aprender IA sin perderme?", "¿Qué proyectos de IA valoran las empresas en un practicante?", "¿Qué materias o cursos me recomiendas?"],
  "Desarrollo de software": ["¿Qué lenguaje o framework me conviene dominar?", "¿Cómo armo un portafolio en GitHub que llame la atención?", "¿Cómo me preparo para entrevistas técnicas?"],
  "Nube": ["¿Qué certificación de nube conviene sacar primero?", "¿Cómo practico sin gastar dinero?", "¿Qué roles existen en nube para alguien que empieza?"],
  "Ciberseguridad": ["¿Qué ruta de aprendizaje me recomiendas?", "¿Qué certificaciones valen la pena al inicio?", "¿Cómo practico de forma legal y segura?"],
  "Procesos y automatización": ["¿Qué herramientas de automatización se usan en la industria?", "¿Cómo detecto un proceso que vale la pena automatizar?", "¿Cómo presento el impacto de una mejora?"],
  "Tecnología": ["¿Qué áreas de tecnología tienen más oportunidades hoy?", "¿Cómo elijo en qué especializarme?", "¿Qué habilidades no técnicas importan más?"],
  "Negocios": ["¿Cómo conecto mi carrera con el lado de negocio?", "¿Qué habilidades buscan en consultoría o estrategia?", "¿Qué experiencias me ayudaron más?"],
  "Empleabilidad": ["¿Qué buscan los reclutadores en alguien de mi carrera?", "¿Cuándo debería empezar a buscar trabajo?", "¿Cómo destaco sin mucha experiencia?"],
  "Preparación de CV y LinkedIn": ["¿Puedes revisar la estructura de mi CV?", "¿Qué debo poner en mi LinkedIn si tengo poca experiencia?", "¿Cómo describo mis proyectos escolares?"],
  "Entrevistas": ["¿Qué preguntas te hicieron en tus entrevistas?", "¿Cómo respondo “háblame de ti”?", "¿Cómo me preparo para un caso o prueba técnica?"],
  "Certificaciones profesionales": ["¿Qué certificación tiene más valor para mi meta?", "¿Cómo te preparaste y cuánto tiempo tomó?", "¿Hay forma de obtenerla gratis o con descuento?"],
  "Proyectos académicos": ["¿Cómo elijo un buen proyecto o socio formador?", "¿Cómo organizo al equipo para no atrasarnos?", "¿Cómo convierto el proyecto en algo para mi portafolio?"],
  "Selección de materias": ["¿Qué materias o profesores me recomiendas?", "¿Qué concentración elegiste y por qué?", "¿Cómo balanceo carga académica y otras actividades?"],
  "Retos con empresas": ["¿Cómo fue trabajar con el socio formador?", "¿Qué hizo destacar a tu equipo?", "¿Cómo aprovecho el reto para conseguir contactos?"],
  "Intercambios académicos": ["¿Cómo elegiste universidad y país?", "¿Qué trámites y fechas debo cuidar?", "¿Cuánto cuesta vivir allá y cómo te organizaste?"],
  "Experiencias internacionales": ["¿Cómo encontraste la oportunidad?", "¿Qué fue lo más difícil al adaptarte?", "¿Cómo lo presentas en tu CV?"],
  "Prácticas profesionales": ["¿Cómo conseguiste tus prácticas?", "¿Qué te hubiera gustado saber antes de empezar?", "¿Cómo convertir las prácticas en oferta de trabajo?"],
  "Internships": ["¿Cuándo y dónde aplicaste?", "¿Cómo fue el proceso de selección?", "¿Qué hiciste para destacar durante el internship?"],
  "Servicio social": ["¿Qué opciones de servicio social me recomiendas?", "¿Cómo lo combino con mis intereses profesionales?", "¿Qué aprendiste de tu servicio?"],
  "Vida universitaria": ["¿Cómo organizas tu tiempo?", "¿Qué actividades te ayudaron a crecer?", "¿Qué harías diferente en tus primeros semestres?"],
  "Asociaciones estudiantiles": ["¿Cómo entro a una asociación o sociedad de alumnos?", "¿Qué aprendiste liderando?", "¿Cómo lo balanceas con la escuela?"],
  "Emprendimiento": ["¿Cómo validaste tu idea?", "¿Qué apoyos del Tec usaste?", "¿Cuáles fueron tus mayores errores?"],
};

const GENERICAS = ["¿Qué te hubiera gustado saber cuando estabas en mi lugar?", "¿Qué recursos me recomiendas?", "¿Cuál sería un buen primer paso para mí?"];

export function preguntasSugeridas(tema?: string | null) {
  return (tema && PREGUNTAS[tema]) || GENERICAS;
}

export function siguientesPasosSugeridos(tema?: string | null) {
  const base = [
    "Escribe en una lista los 3 consejos más útiles de la sesión.",
    "Conecta con tu mentor en LinkedIn si ambos lo desean.",
  ];
  const porTema: Record<string, string> = {
    "Internships": "Arma una lista de 10 empresas y sus fechas de aplicación.",
    "Prácticas profesionales": "Actualiza tu CV y aplica a 3 vacantes esta semana.",
    "Preparación de CV y LinkedIn": "Aplica los cambios a tu CV y pide una segunda revisión.",
    "Entrevistas": "Practica 5 preguntas en voz alta y grábate.",
    "Certificaciones profesionales": "Define fecha de examen y un plan de estudio semanal.",
    "Intercambios académicos": "Revisa la convocatoria y apunta las fechas límite.",
    "Selección de materias": "Arma tu horario tentativo con las materias recomendadas.",
    "Datos y analítica": "Empieza un proyecto pequeño con datos públicos.",
    "Inteligencia Artificial": "Termina un curso introductorio y haz un mini proyecto.",
    "Desarrollo de software": "Sube un proyecto a GitHub con un README claro.",
  };
  return [...(tema && porTema[tema] ? [porTema[tema]] : []), ...base];
}

// ---------- Prellenado desde el texto de LinkedIn ----------
const HERRAMIENTAS = ["Python", "SQL", "R", "Excel", "Power BI", "Tableau", "Java", "JavaScript", "TypeScript", "React", "Node.js", "C++", "C#", "Go", "AWS", "Azure", "Google Cloud", "GCP", "Docker", "Kubernetes", "Git", "Linux", "TensorFlow", "PyTorch", "Pandas", "Spark", "Figma", "SAP", "Salesforce", "Power Automate", "Minitab", "MATLAB", "Jira"];
const IDIOMAS: Record<string, string> = { español: "Español", spanish: "Español", inglés: "Inglés", ingles: "Inglés", english: "Inglés", francés: "Francés", french: "Francés", alemán: "Alemán", german: "Alemán", portugués: "Portugués", portuguese: "Portugués", italiano: "Italiano", italian: "Italiano", chino: "Chino", mandarin: "Chino", japonés: "Japonés", japanese: "Japonés", coreano: "Coreano", korean: "Coreano" };
const INDUSTRIAS = ["Consultoría", "Banca", "Finanzas", "Retail", "Manufactura", "Automotriz", "Tecnología", "Salud", "Educación", "Gobierno", "Energía", "Telecomunicaciones", "Logística", "Startups", "Seguros", "Alimentos", "Farmacéutica"];
const CERT_PISTAS = /(certified|certificación|certificate|certification|aws certified|azure fundamentals|google data analytics|scrum|pmp|six sigma|comptia|cisco|ccna|itil)/i;
const TEMAS_PISTAS: Record<string, RegExp> = {
  "Datos y analítica": /(data analy|analista de datos|analytics|business intelligence|power bi|tableau)/i,
  "Inteligencia Artificial": /(machine learning|inteligencia artificial|\bai\b|\bia\b|deep learning|nlp)/i,
  "Desarrollo de software": /(software|developer|desarrollador|frontend|backend|full ?stack)/i,
  "Nube": /(aws|azure|google cloud|gcp|cloud|nube)/i,
  "Ciberseguridad": /(security|seguridad|ciberseguridad|cybersecurity|pentest)/i,
  "Procesos y automatización": /(automatiza|automation|lean|six sigma|mejora continua|rpa)/i,
  "Negocios": /(business|negocio|estrategia|strategy|consult)/i,
  "Emprendimiento": /(founder|fundador|emprend|startup)/i,
  "Internships": /(intern\b|internship|becario)/i,
  "Prácticas profesionales": /(prácticas|practicante|trainee)/i,
  "Intercambios académicos": /(intercambio|exchange)/i,
  "Experiencias internacionales": /(intercambio|exchange|abroad|extranjero)/i,
  "Certificaciones profesionales": CERT_PISTAS,
  "Asociaciones estudiantiles": /(sociedad de alumnos|asociación estudiantil|student association|capítulo estudiantil)/i,
  "Servicio social": /(servicio social|voluntari)/i,
};

export function extraerDeLinkedIn(texto: string, temasDisponibles: string[]) {
  const t = texto.replace(/\s+/g, " ");
  const bajo = t.toLowerCase();
  const herramientas = HERRAMIENTAS.filter((h) =>
    new RegExp(`(^|[^a-z0-9])${h.replace(/[.+#]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(t),
  );
  const idiomas = [...new Set(Object.entries(IDIOMAS).filter(([k]) => bajo.includes(k)).map(([, v]) => v))];
  const industrias = INDUSTRIAS.filter((i) => bajo.includes(i.toLowerCase()));
  const certificaciones = [...new Set(
    texto.split(/\n|·|•|\|/).map((l) => l.trim()).filter((l) => l.length > 4 && l.length < 90 && CERT_PISTAS.test(l)),
  )].slice(0, 6);
  const temas = Object.entries(TEMAS_PISTAS)
    .filter(([tema, re]) => temasDisponibles.includes(tema) && re.test(t))
    .map(([tema]) => tema);
  return { herramientas, idiomas, industrias, certificaciones, temas };
}
