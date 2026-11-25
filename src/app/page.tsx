// Página de inicio: lo primero que ve cualquier persona al entrar a la app.
// Por ahora es solo informativa; los botones se conectarán al login más adelante.

const areas = [
  "Datos y analítica",
  "Inteligencia Artificial",
  "Desarrollo de software",
  "Internships",
  "Intercambios",
  "CV y LinkedIn",
  "Entrevistas",
  "Emprendimiento",
];

const pasos = [
  { titulo: "Busca", texto: "Explora mentores de tu carrera por tema, experiencia o intercambio." },
  { titulo: "Solicita", texto: "Elige un tema, un horario y cuéntale qué quieres platicar." },
  { titulo: "Conecta", texto: "Ten tu sesión y, si quieren, sigan en contacto por LinkedIn." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <span className="text-lg font-bold">Mentoría Tec</span>
        <a
          href="/entrar"
          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Entrar con correo @tec.mx
        </a>
      </header>

      <section className="mx-auto max-w-5xl px-4 pt-12 pb-16">
        <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
          Aprende de quienes ya recorrieron tu carrera
        </h1>
        <p className="mt-4 max-w-xl text-lg text-slate-600">
          Conecta con estudiantes avanzados y egresados que, de forma voluntaria, comparten su
          experiencia en internships, intercambios, certificaciones y más.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/entrar" className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800">
            Busco mentoría
          </a>
          <a href="/entrar" className="rounded-lg border border-slate-300 px-5 py-3 font-semibold hover:bg-slate-50">
            Quiero ser mentor
          </a>
        </div>
        <ul className="mt-10 flex flex-wrap gap-2">
          {areas.map((area) => (
            <li key={area} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700">
              {area}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:grid-cols-3">
          {pasos.map((paso, i) => (
            <div key={paso.titulo}>
              <span className="text-sm font-semibold text-blue-700">Paso {i + 1}</span>
              <h2 className="mt-1 text-xl font-bold">{paso.titulo}</h2>
              <p className="mt-2 text-slate-600">{paso.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-500">
        Servicio voluntario entre miembros de la comunidad. No es una asesoría profesional oficial
        ni sustituye los canales institucionales.
      </footer>
    </main>
  );
}
