"use client";

// Aquí llega el usuario al abrir el link del correo.
// Supabase manda la sesión en la parte "#..." de la dirección; la guardamos
// en cookies y lo enviamos a llenar su perfil o a su panel.
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function entrar() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");

      if (!access_token || !refresh_token) {
        const codigo = hash.get("error_code");
        setError(
          codigo === "otp_expired"
            ? "Este link ya se usó o venció."
            : "No pudimos validar el link.",
        );
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error || !data.user) {
        setError("No pudimos iniciar tu sesión.");
        return;
      }

      const { data: perfil } = await supabase
        .from("profiles")
        .select("full_name, career")
        .eq("id", data.user.id)
        .single();
      const completo = perfil?.full_name && perfil?.career;
      // replace: quita los tokens de la barra de direcciones y del historial.
      window.location.replace(completo ? "/panel" : "/perfil");
    }
    entrar();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        {error ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">{error}</h1>
            <p className="mt-2 text-slate-600">Pide un link nuevo para entrar.</p>
            <Link
              href="/entrar"
              className="mt-4 inline-block rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800"
            >
              Pedir otro link
            </Link>
          </>
        ) : (
          <p className="text-slate-600">Entrando…</p>
        )}
      </div>
    </main>
  );
}
