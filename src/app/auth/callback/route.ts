// Aquí llega el usuario al dar clic en el link del correo.
// Cambiamos el "código" del link por una sesión y lo mandamos a su perfil o panel.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      // Si todavía no llena su perfil, lo mandamos a completarlo.
      const { data: perfil } = await supabase
        .from("profiles")
        .select("full_name, career")
        .eq("id", data.user.id)
        .single();
      const completo = perfil?.full_name && perfil?.career;
      return NextResponse.redirect(`${origin}${completo ? "/panel" : "/perfil"}`);
    }
  }

  return NextResponse.redirect(`${origin}/entrar?error=link`);
}
