"use client";

export default function Imprimir() {
  return (
    <button onClick={() => window.print()} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
      Imprimir / Guardar PDF
    </button>
  );
}
