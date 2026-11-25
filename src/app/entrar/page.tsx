"use client";

// Página de inicio de sesión: el usuario escribe su correo del Tec y
// recibe un código (o un link) para entrar. No hay contraseñas.
import { useState } from "react";
import Link from "next/link";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export default function EntrarPage() {
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [verificando, setVerificando] = useState(false);
  const [estado, setEstado] = useState<"inicio" | "enviando" | "enviado">("inicio");
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEstado("enviando");

    // Flujo "implicit": el link funciona aunque se abra en otro navegador o
    // en el celular (no depende de una llave guardada en este navegador).
    const supabase = createSupabase(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { flowType: "implicit", persistSession: false, detectSessionInUrl: false } },
    );
    const { error } = await supabase.auth.signInWithOtp({
      email: correo.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setEstado("inicio");
      if (error.message.toLowerCase().includes("database error")) {
        setError("Solo se pueden registrar correos institucionales del Tec (@tec.mx).");
      } else if (error.status === 429) {
        setError("Se enviaron demasiados correos. Espera unos minutos e inténtalo de nuevo.");
      } else {
        setError("No pudimos enviar el correo. Revisa que esté bien escrito.");
      }
      return;
    }
    setEstado("enviado");
  }

  // Valida el código del correo y crea la sesión en este navegador.
  async function verificar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerificando(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: correo.trim().toLowerCase(),
      token: codigo,
      type: "email",
    });
    if (error || !data.user) {
      setVerificando(false);
      setError("El código no es válido o ya venció. Revísalo o pide uno nuevo.");
      return;
    }
    const { data: perfil } = await supabase
      .from("profiles")
      .select("full_name, career")
      .eq("id", data.user.id)
      .single();
    window.location.replace(perfil?.full_name && perfil?.career ? "/panel" : "/perfil");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/" className="text-sm font-bold text-slate-900">
          Mentoría Tec
        </Link>

        {estado === "enviado" ? (
          <div className="mt-6">
            <h1 className="text-2xl font-bold text-slate-900">Revisa tu correo</h1>
            <p className="mt-2 text-slate-600">
              Te enviamos un correo a <strong>{correo}</strong>. Escribe aquí el código que viene
              en el correo.
            </p>
            <form onSubmit={verificar} className="mt-4">
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Código"
                maxLength={8}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-2xl tracking-[0.3em] text-slate-900 outline-none focus:border-blue-700"
              />
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={verificando || codigo.length < 6}
                className="mt-3 w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
              >
                {verificando ? "Verificando…" : "Entrar"}
              </button>
            </form>
            <p className="mt-3 text-sm text-slate-500">
              Si tu correo trae un link en lugar de código, ábrelo y entrarás directo.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              ¿No llegó? Revisa la carpeta de spam o{" "}
              <button className="text-blue-700 underline" onClick={() => setEstado("inicio")}>
                inténtalo de nuevo
              </button>
              .
            </p>
          </div>
        ) : (
          <form onSubmit={enviar} className="mt-6">
            <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
            <p className="mt-1 text-slate-600">Usa tu correo institucional. No necesitas contraseña.</p>
            <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="correo">
              Correo
            </label>
            <input
              id="correo"
              type="email"
              required
              autoComplete="email"
              placeholder="A01234567@tec.mx"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-blue-700"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={estado === "enviando"}
              className="mt-4 w-full rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {estado === "enviando" ? "Enviando…" : "Enviarme el código"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
