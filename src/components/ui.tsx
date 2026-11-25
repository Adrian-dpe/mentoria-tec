// Piezas visuales pequeñas que se repiten.
import { ESTADOS } from "@/lib/mentoria";

export function Estado({ status }: { status: string }) {
  const e = ESTADOS[status] ?? { texto: status, color: "bg-slate-100 text-slate-700" };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${e.color}`}>{e.texto}</span>;
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{children}</span>;
}

export function Tarjeta({ titulo, children, accion }: { titulo: string; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-slate-900">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

export const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-700";
export const labelCls = "block text-sm font-medium text-slate-700";
export const btnPrimario =
  "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-60";
export const btnSecundario =
  "rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60";
